import { expect, it } from 'vitest';
import { buildManagerMessage, buildManagerUrl } from './telegram-order';
import type { Product } from '../types/product';

const product: Product = {
  id: 'product-1', slug: 'tom-ford-oud-wood-50', brand: 'Tom Ford', name: 'Oud Wood',
  concentration: 'EDP', volumeMl: 50, priceRub: 26_000, gender: 'unisex', availability: 'in-stock',
  description: '', notes: [], imageUrl: '', sourceUrl: '', sourcePostId: 1, publishedAt: null,
};

it('builds a ready-to-send message with the exact fragrance and site URL', () => {
  expect(buildManagerMessage(product, 'https://jardin-secret.ru')).toBe(
    'Здравствуйте! Я с сайта Jardin Secret и хочу заказать Tom Ford Oud Wood, EDP, 50 мл. Подскажите, пожалуйста, актуальную цену и наличие.\n\nhttps://jardin-secret.ru/product/tom-ford-oud-wood-50',
  );
});

it('encodes the message for the manager Telegram dialog', () => {
  const url = new URL(buildManagerUrl(product, 'https://jardin-secret.ru'));
  expect(`${url.origin}${url.pathname}`).toBe('https://t.me/jardinmanager');
  expect(url.searchParams.get('text')).toBe(buildManagerMessage(product, 'https://jardin-secret.ru'));
});

it('omits unknown variant fields without leaving broken punctuation', () => {
  expect(buildManagerMessage({...product, concentration: null, volumeMl: null}, 'https://jardin-secret.ru')).toContain(
    'хочу заказать Tom Ford Oud Wood. Подскажите',
  );
});
