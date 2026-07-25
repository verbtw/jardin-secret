import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { getProducts } from './catalog';
import legacyPackshots from './legacy-packshots.json';

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
      expect(product.imageUrl, product.slug).not.toMatch(/^\/products\/\d+\.jpg$/);
    }
  });

  it('normalizes every sourced packshot to the same square studio canvas', async () => {
    for (const { imageUrl } of Object.values(legacyPackshots)) {
      const metadata = await sharp(resolve('public', imageUrl.replace(/^\//, ''))).metadata();
      expect([metadata.width, metadata.height], imageUrl).toEqual([1600, 1600]);
    }
  });
});
