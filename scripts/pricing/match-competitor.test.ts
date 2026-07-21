import {describe, expect, it} from 'vitest';
import {findExactCompetitorMatches} from './match-competitor';
import type {CompetitorCandidate, ProductVariant} from './competitor-types';

const product: ProductVariant = {
  brand: 'Dolce & Gabbana',
  name: 'The One Gold',
  flanker: 'Pour Homme',
  concentration: 'EDP',
  volumeMl: 100,
};

function candidate(overrides: Partial<CompetitorCandidate> = {}): CompetitorCandidate {
  return {
    ...product,
    source: 'randewoo',
    url: 'https://randewoo.ru/product/the-one-gold',
    priceRub: 19_950,
    title: 'Dolce & Gabbana The One Gold Pour Homme Парфюмерная вода 100 мл',
    packaging: 'retail',
    ...overrides,
  };
}

describe('findExactCompetitorMatches', () => {
  it('accepts the same normalized brand, name, flanker, concentration and volume', () => {
    const matches = findExactCompetitorMatches(product, [
      candidate({brand: 'Dolce and Gabbana', name: 'the one  gold'}),
    ]);

    expect(matches).toEqual([
      expect.objectContaining({source: 'randewoo', priceRub: 19_950, confidence: 1}),
    ]);
  });

  it.each([
    ['wrong volume', {volumeMl: 50}],
    ['wrong concentration', {concentration: 'EDT'}],
    ['wrong flanker', {flanker: 'For Women'}],
    ['missing flanker', {flanker: null}],
    ['different fragrance', {name: 'The One Intense'}],
  ] as const)('rejects %s', (_label, overrides) => {
    expect(findExactCompetitorMatches(product, [candidate(overrides)])).toEqual([]);
  });

  it.each(['tester', 'sample', 'refill', 'set'] as const)('rejects %s packaging', (packaging) => {
    expect(findExactCompetitorMatches(product, [candidate({packaging})])).toEqual([]);
  });

  it('rejects invalid prices and non-http product URLs', () => {
    expect(findExactCompetitorMatches(product, [
      candidate({priceRub: 0}),
      candidate({url: 'javascript:alert(1)'}),
    ])).toEqual([]);
  });

  it('keeps the lowest exact offer from each competitor', () => {
    const matches = findExactCompetitorMatches(product, [
      candidate({priceRub: 20_500}),
      candidate({priceRub: 19_950}),
      candidate({source: 'goldapple', url: 'https://goldapple.ru/item', priceRub: 21_000}),
    ]);

    expect(matches.map(({source, priceRub}) => ({source, priceRub}))).toEqual([
      {source: 'randewoo', priceRub: 19_950},
      {source: 'goldapple', priceRub: 21_000},
    ]);
  });
});
