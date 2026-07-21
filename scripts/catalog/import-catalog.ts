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
  upsertProducts?(products: ImportProduct[]): Promise<Array<{canonicalKey: string; id: string; created: boolean}>>;
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
      const productsToUpsert = new Map<string, ImportProduct>();
      const preparedRows = rows.map((row) => {
        summary.sourceRows += 1;
        const parsed = parseSourceRow(row.name);
        const costRub = Math.round(row.priceUsd * exchangeRate);
        let canonicalKey: string | null = null;

        if (parsed.kind === 'fragrance') {
          const base = {
            brand: parsed.brand,
            name: parsed.name,
            flanker: parsed.flanker,
            concentration: parsed.concentration,
            volumeMl: parsed.volumeMl,
          };
          canonicalKey = productCanonicalKey(base);
          if (!productCache.has(canonicalKey) && !productsToUpsert.has(canonicalKey)) {
            productsToUpsert.set(canonicalKey, {
              ...base,
              canonicalKey,
              slug: productSlug(base),
              lastSeenAt: observedAt,
            });
          }
          summary.matched += 1;
        } else {
          summary[parsed.kind] += 1;
        }

        return {row, parsed, costRub, canonicalKey};
      });

      if (repo.upsertProducts && productsToUpsert.size) {
        const savedProducts = await repo.upsertProducts([...productsToUpsert.values()]);
        for (const product of savedProducts) {
          productCache.set(product.canonicalKey, product.id);
          if (product.created) summary.productsCreated += 1;
        }
      } else {
        for (const productInput of productsToUpsert.values()) {
          const product = await repo.upsertProduct(productInput);
          productCache.set(productInput.canonicalKey, product.id);
          if (product.created) summary.productsCreated += 1;
        }
      }

      const supplierOffers: ImportOffer[] = [];
      for (const {row, parsed, costRub, canonicalKey} of preparedRows) {
        if (parsed.kind === 'fragrance') {
          const productId = productCache.get(canonicalKey!);
          if (!productId) throw new Error(`Imported product was not persisted: ${canonicalKey}`);
          supplierOffers.push({
            runId,
            productId,
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
      const deduplicatedOffers = new Map<string, ImportOffer>();
      for (const offer of supplierOffers) {
        const existing = deduplicatedOffers.get(offer.sourceRow);
        if (!existing || offer.costRub < existing.costRub) deduplicatedOffers.set(offer.sourceRow, offer);
      }
      const offersToSave = [...deduplicatedOffers.values()];
      if (repo.upsertOffers) await repo.upsertOffers(offersToSave);
      else for (const offer of offersToSave) await repo.upsertOffer(offer);
    }

    await repo.markUnseenUnavailable(observedAt);
    await repo.completeRun(runId, {...summary, exchangeRate, supplierCount: suppliers.length});
    return summary;
  } catch (error) {
    await repo.failRun(runId, error instanceof Error ? error.message : 'Unknown catalog import failure');
    throw error;
  }
}
