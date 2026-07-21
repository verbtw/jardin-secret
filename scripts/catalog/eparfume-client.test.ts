import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { EparfumeClient, type FetchLike } from './eparfume-client';

const fixture = (name: string) => readFile(join(process.cwd(), 'scripts/catalog/fixtures', name), 'utf8');

function response(body: string, status = 200) {
  return new Response(body, {status, headers: {'content-type': body.startsWith('{') ? 'application/json' : 'text/html'}});
}

describe('EparfumeClient', () => {
  it('authenticates with the documented login fields without exposing credentials in a URL', async () => {
    const index = await fixture('eparfume-index.html');
    const fetchImpl = vi.fn<FetchLike>(async () => response(index));
    const client = new EparfumeClient({email: 'manager@example.test', password: 'secret-value', fetchImpl});

    await client.login();

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://eparfume.ru/index.php');
    expect(init?.method).toBe('POST');
    expect(String(init?.body)).toBe('email=manager%40example.test&password=secret-value&new_login=1');
    expect(String(url)).not.toContain('secret-value');
  });

  it('reads the current internal exchange rate', async () => {
    const index = await fixture('eparfume-index.html');
    const client = new EparfumeClient({email: 'x', password: 'y', fetchImpl: async () => response(index)});
    expect(await client.getExchangeRate()).toBe(82);
  });

  it('lists supplier price identifiers', async () => {
    const prices = await fixture('eparfume-prices.html');
    const client = new EparfumeClient({email: 'x', password: 'y', fetchImpl: async () => response(prices)});
    expect(await client.listSuppliers()).toEqual([
      {code: 'Y/D', priceId: '1156106322'},
      {code: 'S/K', priceId: '1267808507'},
    ]);
  });

  it('parses paginated DataTables rows and dollar prices', async () => {
    const page = await fixture('eparfume-price-response.json');
    const fetchImpl = vi.fn<FetchLike>(async () => response(page));
    const client = new EparfumeClient({email: 'x', password: 'y', fetchImpl});

    expect(await client.readSupplierRows('1156106322')).toEqual([
      {name: 'Tom Ford Oud Wood edp 50ml', priceUsd: 74.2},
      {name: 'Kilian Angels Share edp 50ml', priceUsd: 125},
      {name: 'Dr. Vranjes диффузор 250ml', priceUsd: 12},
    ]);
    expect(String(fetchImpl.mock.calls[0][1]?.body)).toContain('length=200');
    expect(String(fetchImpl.mock.calls[0][1]?.body)).toContain('PriceID=1156106322');
  });

  it('fails closed when the login form is returned again', async () => {
    const login = '<form id="form-2"><input name="new_login"></form>';
    const client = new EparfumeClient({email: 'x', password: 'wrong', fetchImpl: async () => response(login)});
    await expect(client.login()).rejects.toThrow('EParfume authentication failed');
  });
});
