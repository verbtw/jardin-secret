import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dedupeProducts, parseChannelPage, postToProduct } from './telegram-parser';
import type { Product } from '../../src/types/product';

const html = readFileSync('scripts/fixtures/channel.html', 'utf8');

describe('Telegram product parser', () => {
  it('extracts an explicit product price and volume', () => {
    const posts = parseChannelPage(html);
    const product = postToProduct(posts.find((post) => post.id === 1739)!);
    expect(product).toMatchObject({
      brand: 'Parfums de Marly',
      name: 'Althaïr',
      volumeMl: 125,
      priceRub: 22200,
      availability: 'in-stock',
    });
  });

  it('rejects editorial posts without a concrete offer', () => {
    const posts = parseChannelPage(html);
    expect(postToProduct(posts.find((post) => post.id === 1736)!)).toBeNull();
  });

  it('keeps the newest and most complete duplicate', () => {
    const products = parseChannelPage(html).map(postToProduct).filter((product): product is Product => product !== null);
    const imagination = dedupeProducts(products).filter((item) => item.slug.includes('imagination'));
    expect(imagination).toHaveLength(1);
    expect(imagination[0].sourcePostId).toBe(1760);
  });

  it('recognizes name-by-brand and prose-leading product posts', () => {
    const posts = parseChannelPage(html);
    expect(postToProduct(posts.find((post) => post.id === 1492)!)).toMatchObject({ brand: 'Kilian', name: 'Intoxicated' });
    expect(postToProduct(posts.find((post) => post.id === 1194)!)).toMatchObject({ brand: 'HFC', name: 'Devil’s Intrigue', volumeMl: 75, priceRub: 25500 });
  });

  it('uses emphasized Telegram titles instead of surrounding sales copy', () => {
    const posts = parseChannelPage(html);
    const post = posts.find((item) => item.id === 1748)!;
    expect(post.emphasizedTexts).toEqual(['AMOUAGE GUIDANCE']);
    expect(postToProduct(post)).toMatchObject({ brand: 'Amouage', name: 'GUIDANCE' });
  });

  it('cleans decorative punctuation and rejects generic or multi-brand names', () => {
    const base = { id: 2000, imageUrls: [], publishedAt: null };
    expect(postToProduct({ ...base, text: 'Byredo / LA TULIPE — В НАЛИЧИИ', emphasizedTexts: [] })).toMatchObject({ name: 'LA TULIPE' });
    expect(postToProduct({ ...base, text: 'Louis Vuitton NEW — В НАЛИЧИИ', emphasizedTexts: [] })).toBeNull();
    expect(postToProduct({ ...base, text: 'Louis Vuitton NEW ---- Ambre Levant — В НАЛИЧИИ', emphasizedTexts: [] })).toMatchObject({ name: 'Ambre Levant' });
    expect(postToProduct({ ...base, text: 'Byredo 💗 — В НАЛИЧИИ', emphasizedTexts: [] })).toBeNull();
    expect(postToProduct({ ...base, text: 'Maison Margiela, Initio, Xerjoff, Dior — всё в наличии', emphasizedTexts: [] })).toBeNull();
  });
});
