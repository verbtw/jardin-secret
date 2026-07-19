import { describe, expect, it } from 'vitest';
import { getProducts } from './catalog';

describe('getProducts', () => {
  it('returns products with stable source links', () => {
    const products = getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      brand: expect.any(String),
      name: expect.any(String),
    });
    expect(products[0].sourceUrl).toMatch(/^https:\/\/t\.me\/jardinnsecret\/\d+$/);
  });
});
