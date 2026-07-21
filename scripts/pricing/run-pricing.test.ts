import {describe, expect, it} from 'vitest';
import {
  runDailyPricing,
  type PricingProduct,
  type PricingRepository,
  type StoredPricingDecision,
} from './run-pricing';

class MemoryPricingRepository implements PricingRepository {
  decisions: StoredPricingDecision[] = [];
  updates: Array<{productId: string; priceRub: number | null; status: string}> = [];

  constructor(private readonly products: PricingProduct[]) {}
  async listProductsForPricing() { return this.products; }
  async saveDecision(decision: Parameters<PricingRepository['saveDecision']>[0]) { this.decisions.push(decision); }
  async updateAutomaticPrice(productId: string, priceRub: number | null, status: 'published' | 'request') {
    this.updates.push({productId, priceRub, status});
  }
}

describe('runDailyPricing', () => {
  it('uses exact current competitor prices and persists the audit decision', async () => {
    const repo = new MemoryPricingRepository([{
      id: 'product-1', costRub: 20_000, priceMode: 'auto', competitorPrices: [29_000, 31_000],
    }]);

    const summary = await runDailyPricing(repo, '2026-07-21T20:00:00.000Z');

    expect(summary).toEqual({processed: 1, published: 1, request: 0, manualPreserved: 0});
    expect(repo.updates).toEqual([{productId: 'product-1', priceRub: 26_000, status: 'published'}]);
    expect(repo.decisions[0]).toEqual(expect.objectContaining({
      productId: 'product-1', calculatedPriceRub: 26_000, profitRub: 6_000,
      lowestCompetitorRub: 29_000, rule: 'competitor_discount', flagged: false,
    }));
  });

  it('shows price on request when the safe margin cannot be reached', async () => {
    const repo = new MemoryPricingRepository([{
      id: 'product-2', costRub: 20_000, priceMode: 'auto', competitorPrices: [22_000],
    }]);

    const summary = await runDailyPricing(repo);

    expect(summary.request).toBe(1);
    expect(repo.updates).toEqual([{productId: 'product-2', priceRub: null, status: 'request'}]);
    expect(repo.decisions[0]).toEqual(expect.objectContaining({flagged: true, flagReason: 'margin_below_floor'}));
  });

  it('calculates but never overwrites a manager manual price', async () => {
    const repo = new MemoryPricingRepository([{
      id: 'product-3', costRub: 10_000, priceMode: 'manual', competitorPrices: [],
    }]);

    const summary = await runDailyPricing(repo);

    expect(summary.manualPreserved).toBe(1);
    expect(repo.updates).toEqual([]);
    expect(repo.decisions).toHaveLength(1);
  });
});
