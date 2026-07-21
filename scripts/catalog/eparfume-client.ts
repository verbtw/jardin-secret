import * as cheerio from 'cheerio';
import makeFetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface EparfumeClientOptions {
  email: string;
  password: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
}

export interface SupplierPriceList {
  code: string;
  priceId: string;
}

export interface SupplierRow {
  name: string;
  priceUsd: number;
}

interface DataTableResponse {
  recordsTotal: number;
  recordsFiltered: number;
  data: Array<[string, string, ...unknown[]]>;
}

function cleanCell(value: string) {
  return cheerio.load(value).text().replace(/\s+/g, ' ').trim();
}

function parseDollarPrice(value: string) {
  const match = cleanCell(value).match(/(\d[\d\s]*(?:[.,]\d+)?)\s*\$/);
  if (!match) throw new Error(`Unsupported EParfume price: ${cleanCell(value)}`);
  return Number(match[1].replace(/\s/g, '').replace(',', '.'));
}

export class EparfumeClient {
  private readonly email: string;
  private readonly password: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(options: EparfumeClientOptions) {
    this.email = options.email;
    this.password = options.password;
    this.baseUrl = (options.baseUrl ?? 'https://eparfume.ru').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? makeFetchCookie(globalThis.fetch, new CookieJar());
  }

  async login() {
    const body = new URLSearchParams({email: this.email, password: this.password, new_login: '1'});
    const response = await this.fetchImpl(`${this.baseUrl}/index.php`, {method: 'POST', body});
    const html = await response.text();
    if (!response.ok || /name=["']new_login["']/i.test(html)) {
      throw new Error('EParfume authentication failed');
    }
  }

  async getExchangeRate() {
    const response = await this.fetchImpl(`${this.baseUrl}/index.php`);
    if (!response.ok) throw new Error(`EParfume exchange-rate request failed: ${response.status}`);
    const text = cheerio.load(await response.text())('body').text().replace(/\s+/g, ' ');
    const match = text.match(/Текущий курс:\s*(\d+(?:[.,]\d+)?)/i);
    if (!match) throw new Error('EParfume exchange rate not found');
    return Number(match[1].replace(',', '.'));
  }

  async listSuppliers(): Promise<SupplierPriceList[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/prices.php`);
    if (!response.ok) throw new Error(`EParfume supplier-list request failed: ${response.status}`);
    const $ = cheerio.load(await response.text());
    return $('tbody tr').map((_, row) => {
      const cells = $(row).find('td');
      const href = $(row).find('a[href*="price.php?id="]').attr('href');
      const priceId = href?.match(/[?&]id=(\d+)/)?.[1];
      const code = cells.eq(0).text().trim();
      return code && priceId ? {code, priceId} : null;
    }).get().filter((item): item is SupplierPriceList => Boolean(item));
  }

  async readSupplierRows(priceId: string): Promise<SupplierRow[]> {
    const rows: SupplierRow[] = [];
    const pageLength = 200;
    let start = 0;
    let draw = 1;
    let total = Number.POSITIVE_INFINITY;

    while (start < total) {
      const body = new URLSearchParams({
        draw: String(draw),
        start: String(start),
        length: String(pageLength),
        'order[0][column]': '0',
        'order[0][dir]': 'asc',
        'search[value]': '',
        'search[regex]': 'false',
        PriceID: priceId,
      });
      const response = await this.fetchImpl(`${this.baseUrl}/js_getPriceList.php`, {method: 'POST', body});
      if (!response.ok) throw new Error(`EParfume price-list request failed: ${response.status}`);
      const page = await response.json() as DataTableResponse;
      if (!Array.isArray(page.data)) throw new Error('Invalid EParfume price-list response');
      total = Number(page.recordsFiltered ?? page.recordsTotal ?? page.data.length);
      rows.push(...page.data.map((row) => ({name: cleanCell(row[0]), priceUsd: parseDollarPrice(row[1])})));
      if (!page.data.length) break;
      start += page.data.length;
      draw += 1;
    }

    return rows;
  }
}
