import { describe, expect, it } from 'vitest';
import { runCatalogImport, type CatalogImportRepository, type ImportOffer, type ImportProduct } from './import-catalog';
import type { SupplierPriceList, SupplierRow } from './eparfume-client';

class MemoryRepository implements CatalogImportRepository {
  products = new Map<string, ImportProduct & {id: string; unavailable?: boolean}>();
  offers = new Map<string, ImportOffer>();
  runs: Array<{id: string; status: string}> = [];
  bulkCalls = 0;

  async startRun() { const run = {id: `run-${this.runs.length + 1}`, status: 'running'}; this.runs.push(run); return run.id; }
  async completeRun(runId: string) { this.runs.find((run) => run.id === runId)!.status = 'completed'; }
  async failRun(runId: string) { this.runs.find((run) => run.id === runId)!.status = 'failed'; }
  async upsertProduct(product: ImportProduct) {
    const existing = this.products.get(product.canonicalKey);
    const saved = {...existing, ...product, id: existing?.id ?? `product-${this.products.size + 1}`, unavailable: false};
    this.products.set(product.canonicalKey, saved);
    return {id: saved.id, created: !existing};
  }
  async upsertOffer(offer: ImportOffer) { this.offers.set(`${offer.supplierCode}|${offer.sourceRow}`, offer); }
  async upsertOffers(offers: ImportOffer[]) { this.bulkCalls += 1; for (const offer of offers) await this.upsertOffer(offer); }
  async markUnseenUnavailable(observedAt: string) {
    for (const [key, product] of this.products) if (product.lastSeenAt !== observedAt) this.products.set(key, {...product, unavailable: true});
  }
  lowestCost(canonicalKey: string) {
    return Math.min(...[...this.offers.values()].filter((offer) => offer.canonicalKey === canonicalKey).map((offer) => offer.costRub));
  }
}

function client(rowsBySupplier: Record<string, SupplierRow[]>) {
  const suppliers: SupplierPriceList[] = Object.keys(rowsBySupplier).map((priceId) => ({code: priceId, priceId}));
  return {
    login: async () => undefined,
    getExchangeRate: async () => 82,
    listSuppliers: async () => suppliers,
    readSupplierRows: async (priceId: string) => rowsBySupplier[priceId],
  };
}

describe('runCatalogImport', () => {
  it('is idempotent and groups supplier offers under one canonical product', async () => {
    const repo = new MemoryRepository();
    const source = client({
      A: [{name: 'Tom Ford Oud Wood edp 50ml', priceUsd: 200}],
      B: [{name: 'Tom Ford Oud Wood eau de parfum 50 ml', priceUsd: 180}],
    });

    const first = await runCatalogImport({client: source, repo, observedAt: '2026-07-21T10:00:00.000Z'});
    const second = await runCatalogImport({client: source, repo, observedAt: '2026-07-22T10:00:00.000Z'});

    expect(first).toMatchObject({productsCreated: 1, matched: 2, review: 0, rejected: 0});
    expect(second).toMatchObject({productsCreated: 0, matched: 2});
    expect(repo.products).toHaveLength(1);
    expect(repo.offers).toHaveLength(2);
    expect(repo.bulkCalls).toBe(4);
    expect(repo.lowestCost('tom ford|oud wood|edp|50')).toBe(14_760);
  });

  it('stores review and rejected rows without creating public products', async () => {
    const repo = new MemoryRepository();
    const summary = await runCatalogImport({
      client: client({A: [
        {name: 'Tom Ford Oud Wood tester edp 50ml', priceUsd: 100},
        {name: 'Dr. Vranjes диффузор 250ml', priceUsd: 20},
      ]}),
      repo,
      observedAt: '2026-07-21T10:00:00.000Z',
    });

    expect(summary).toMatchObject({productsCreated: 0, matched: 0, review: 1, rejected: 1});
    expect(repo.products).toHaveLength(0);
    expect(repo.offers).toHaveLength(2);
  });

  it('marks products missing from the next successful snapshot unavailable', async () => {
    const repo = new MemoryRepository();
    await runCatalogImport({client: client({A: [{name: 'Tom Ford Oud Wood edp 50ml', priceUsd: 200}]}), repo, observedAt: '2026-07-21T10:00:00.000Z'});
    await runCatalogImport({client: client({A: []}), repo, observedAt: '2026-07-22T10:00:00.000Z'});
    expect([...repo.products.values()][0].unavailable).toBe(true);
  });

  it('records failed runs and preserves the previous successful catalog', async () => {
    const repo = new MemoryRepository();
    const failingClient = {...client({}), listSuppliers: async () => { throw new Error('source unavailable'); }};
    await expect(runCatalogImport({client: failingClient, repo, observedAt: '2026-07-21T10:00:00.000Z'})).rejects.toThrow('source unavailable');
    expect(repo.runs[0].status).toBe('failed');
  });
});
