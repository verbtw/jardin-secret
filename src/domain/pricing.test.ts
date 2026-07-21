import { describe, expect, it } from 'vitest';
import { calculateRetailPrice } from './pricing';

describe('calculateRetailPrice', () => {
  it('stays 2–3k below a competitor while preferring a near-5k margin', () => {
    expect(calculateRetailPrice({costRub: 20_000, competitorPrices: [29_000]})).toEqual({
      priceRub: 26_000,
      profitRub: 6_000,
      lowestCompetitorRub: 29_000,
      reason: 'competitor_discount',
    });
  });

  it('uses the lowest exact competitor price', () => {
    expect(calculateRetailPrice({costRub: 20_000, competitorPrices: [31_000, 25_000]})).toMatchObject({
      priceRub: 23_000,
      profitRub: 3_000,
      lowestCompetitorRub: 25_000,
    });
  });

  it('caps a large price gap at 10k profit', () => {
    expect(calculateRetailPrice({costRub: 20_000, competitorPrices: [45_000]})).toMatchObject({
      priceRub: 30_000,
      profitRub: 10_000,
    });
  });

  it('uses a 5k margin when competitors have no exact variant', () => {
    expect(calculateRetailPrice({costRub: 20_149, competitorPrices: []})).toEqual({
      priceRub: 25_100,
      profitRub: 4_951,
      lowestCompetitorRub: null,
      reason: 'default_margin',
    });
  });

  it('returns price-on-request below the 1500-ruble profit floor', () => {
    expect(calculateRetailPrice({costRub: 20_000, competitorPrices: [21_500]})).toEqual({
      priceRub: null,
      profitRub: null,
      lowestCompetitorRub: 21_500,
      reason: 'margin_below_floor',
    });
  });

  it('ignores invalid competitor observations', () => {
    expect(calculateRetailPrice({costRub: 10_000, competitorPrices: [0, Number.NaN, -500]})).toMatchObject({
      priceRub: 15_000,
      reason: 'default_margin',
    });
  });

  it('rejects an invalid supplier cost', () => {
    expect(() => calculateRetailPrice({costRub: 0, competitorPrices: []})).toThrow('Supplier cost must be positive');
  });
});
