import type { SupplierPriceList, SupplierRow } from './eparfume-client.js';
import { parseSourceRow } from './parse-source-row.js';

export interface CatalogSourceClient {
  login(): Promise<void>;
  getExchangeRate(): Promise<number>;
  listSuppliers(): Promise<SupplierPriceList[]>;
  readSupplierRows(priceId: string): Promise<SupplierRow[]>;
}

export interface ImportProduct {
  canonicalKey: string;
  slug: string;
  brand: string;
  name: string;
  flanker: string | null;
  concentration: string;
  volumeMl: number;
  lastSeenAt: string;
}

export interface ImportOffer {
  runId: string;
  productId: string | null;
  canonicalKey: string | null;
  supplierCode: string;
  sourceRow: string;
  sourcePriceUsd: number;
  costRub: number;
  parseStatus: 'matched' | 'review' | 'rejected';
  parseReason: string | null;
  observedAt: string;
}

export interface CatalogImportRepository {
  startRun(observedAt: string): Promise<string>;
  completeRun(runId: string, summary: ImportSummary & {exchangeRate: number; supplierCount: number}): Promise<void>;
  failRun(runId: string, errorMessage: string): Promise<void>;
  upsertProduct(product: ImportProduct): Promise<{id: string; created: boolean}>;
  upsertOffer(offer: ImportOffer): Promise<void>;
  upsertOffers?(offers: ImportOffer[]): Promise<void>;
  markUnseenUnavailable(observedAt: string): Promise<void>;
}

export interface ImportSummary {
  productsCreated: number;
  matched: number;
  review: number;
  rejected: number;
  sourceRows: number;
}

export interface CatalogImportDependencies {
  client: CatalogSourceClient;
  repo: CatalogImportRepository;
  observedAt?: string;
}

function normalizeKeyPart(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US')
    .replace(/[’']/g, '').replace(/[^a-z0-9а-яё]+/gi, ' ').trim();
}

export function productCanonicalKey(product: Pick<ImportProduct, 'brand' | 'name' | 'flanker' | 'concentration' | 'volumeMl'>) {
  return [product.brand, product.name, product.flanker, product.concentration, String(product.volumeMl)]
    .filter((value): value is string => Boolean(value))
    .map(normalizeKeyPart)
    .join('|');
}

export function productSlug(product: Pick<ImportProduct, 'brand' | 'name' | 'flanker' | 'concentration' | 'volumeMl'>) {
  return [product.brand, product.name, product.flanker, product.concentration, `${product.volumeMl}ml`]
    .filter((value): value is string => Boolean(value))
    .map(normalizeKeyPart)
    .join('-')
    .replace(/\s+/g, '-');
}

export async function runCatalogImport({client, repo, observedAt = new Date().toISOString()}: CatalogImportDependencies): Promise<ImportSummary> {
  const summary: ImportSummary = {productsCreated: 0, matched: 0, review: 0, rejected: 0, sourceRows: 0};
  const runId = await repo.startRun(observedAt);
  const productCache = new Map<string, string>();

  try {
    await client.login();
    const exchangeRate = await client.getExchangeRate();
    const suppliers = await client.listSuppliers();

    for (const supplier of suppliers) {
      const rows = await client.readSupplierRows(supplier.priceId);
      const supplierOffers: ImportOffer[] = [];
      for (const row of rows) {
        summary.sourceRows += 1;
        const parsed = parseSourceRow(row.name);
        const costRub = Math.round(row.priceUsd * exchangeRate);

        if (parsed.kind === 'fragrance') {
          const base = {
            brand: parsed.brand,
            name: parsed.name,
            flanker: parsed.flanker,
            concentration: parsed.concentration,
            volumeMl: parsed.volumeMl,
          };
          const canonicalKey = productCanonicalKey(base);
          const cachedId = productCache.get(canonicalKey);
          const product = cachedId ? {id: cachedId, created: false} : await repo.upsertProduct({
              ...base,
              canonicalKey,
              slug: productSlug(base),
              lastSeenAt: observedAt,
            });
          if (!cachedId) productCache.set(canonicalKey, product.id);
          if (product.created) summary.productsCreated += 1;
          summary.matched += 1;
          supplierOffers.push({
            runId,
            productId: product.id,
            canonicalKey,
            supplierCode: supplier.code,
            sourceRow: row.name,
            sourcePriceUsd: row.priceUsd,
            costRub,
            parseStatus: 'matched',
            parseReason: null,
            observedAt,
          });
        } else {
          summary[parsed.kind] += 1;
          supplierOffers.push({
            runId,
            productId: null,
            canonicalKey: null,
            supplierCode: supplier.code,
            sourceRow: row.name,
            sourcePriceUsd: row.priceUsd,
            costRub,
            parseStatus: parsed.kind,
            parseReason: parsed.reason,
            observedAt,
          });
        }
      }
      if (repo.upsertOffers) await repo.upsertOffers(supplierOffers);
      else for (const offer of supplierOffers) await repo.upsertOffer(offer);
    }

    await repo.markUnseenUnavailable(observedAt);
    await repo.completeRun(runId, {...summary, exchangeRate, supplierCount: suppliers.length});
    return summary;
  } catch (error) {
    await repo.failRun(runId, error instanceof Error ? error.message : 'Unknown catalog import failure');
    throw error;
  }
}
