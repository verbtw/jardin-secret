import type {ProductGender} from '../../src/types/product.js';

export function normalizeProductGender(value: string | null | undefined): ProductGender {
  const normalized = value?.normalize('NFKC').toLocaleLowerCase('ru-RU').trim() ?? '';
  if (/^(female|woman|women|женск(?:ий|ая|ие)?|для женщин)$/.test(normalized)) return 'women';
  if (/^(male|man|men|мужск(?:ой|ая|ие)?|для мужчин)$/.test(normalized)) return 'men';
  if (/^(unisex|унисекс)$/.test(normalized)) return 'unisex';
  return 'unknown';
}
