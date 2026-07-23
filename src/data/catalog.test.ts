import { describe, expect, it } from 'vitest';
import { getProducts } from './catalog';

describe('getProducts', () => {
  it('replaces legacy Telegram sales copy with curated fragrance details', () => {
    const products = getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      brand: expect.any(String),
      name: expect.any(String),
    });
    expect(products[0].sourceUrl).toMatch(/^https:\/\/(?!t\.me)/);
    expect(products[0].description.length).toBeGreaterThanOrEqual(60);
  });

  it('ships every legacy product with a sourced description, notes, and a working image', () => {
    for (const product of getProducts()) {
      const notes = [
        ...(product.topNotes ?? []), ...(product.heartNotes ?? []),
        ...(product.baseNotes ?? []), ...(product.keyNotes ?? []),
      ];
      expect(product.description.length, product.slug).toBeGreaterThanOrEqual(60);
      expect(notes.length, product.slug).toBeGreaterThan(0);
      expect(product.sourceUrl, product.slug).toMatch(/^https:\/\//);
      expect(product.imageUrl, product.slug).not.toContain('placeholder');
      expect(product.imageUrl, product.slug).toMatch(/^(?:https:\/\/|\/products\/)/);
    }
  });
});
