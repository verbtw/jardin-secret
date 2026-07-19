import { expect, it } from 'vitest';
import { formatOrder, validateCheckout, type CheckoutValues } from './order';
import type { Product } from '../types/product';

const validValues: CheckoutValues = { name: 'Анна', phone: '+7 999 000-00-00', city: 'Москва', address: 'ПВЗ на Тверской', delivery: 'СДЭК', comment: '' };
const products = [{ id: '2', brand: 'Amouage', name: 'Guidance', priceRub: null, volumeMl: 100, sourceUrl: 'https://t.me/jardinnsecret/1748' }] as Product[];

it('requires contact and delivery details', () => {
  expect(validateCheckout({ name: '', phone: '', city: '', address: '', delivery: '', comment: '' })).toEqual({
    name: 'Укажите имя', phone: 'Укажите телефон', city: 'Укажите город', address: 'Укажите адрес или пункт выдачи', delivery: 'Выберите способ доставки',
  });
});

it('rejects a phone with fewer than ten digits', () => {
  expect(validateCheckout({ ...validValues, phone: '+7 999' })).toMatchObject({ phone: 'Проверьте номер телефона' });
});

it('marks unknown prices for manager confirmation', () => {
  const text = formatOrder(validValues, [{ productId: '2', quantity: 1 }], products);
  expect(text).toContain('Amouage Guidance — 1 шт. — цену уточнить');
  expect(text).toContain('Телефон: +7 999 000-00-00');
  expect(text).toContain('Стоимость и наличие подтвердит менеджер.');
});
