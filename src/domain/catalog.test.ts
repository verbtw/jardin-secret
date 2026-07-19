import { describe, expect, it } from 'vitest';
import { filterProducts, getOrderReadiness } from './catalog';
import type { Product } from '../types/product';

const products = [
  { id: '1', slug: 'lv-imagination', brand: 'Louis Vuitton', name: 'Imagination', priceRub: 45500, volumeMl: 100, gender: 'unisex', availability: 'in-stock', sourcePostId: 2 },
  { id: '2', slug: 'amouage-guidance', brand: 'Amouage', name: 'Guidance', priceRub: null, volumeMl: null, gender: 'unknown', availability: 'ask-manager', sourcePostId: 1 },
] as Product[];

describe('filterProducts', () => {
  it('searches brand and name case-insensitively', () => {
    expect(filterProducts(products, { search: 'amouage' }).map((product) => product.id)).toEqual(['2']);
  });

  it('keeps unknown prices when no price filter is active', () => {
    expect(filterProducts(products, {}).map((product) => product.id)).toEqual(['1', '2']);
  });

  it('sorts unknown prices after known prices', () => {
    expect(filterProducts(products, { sort: 'price-asc' }).map((product) => product.id)).toEqual(['1', '2']);
  });
});

describe('getOrderReadiness', () => {
  it('requires both a price and a volume before checkout', () => {
    expect(getOrderReadiness({ priceRub: null, volumeMl: null })).toEqual({ ready: false, missing: ['price', 'volume'] });
    expect(getOrderReadiness({ priceRub: 12000, volumeMl: null })).toEqual({ ready: false, missing: ['volume'] });
    expect(getOrderReadiness({ priceRub: 12000, volumeMl: 100 })).toEqual({ ready: true, missing: [] });
  });
});
