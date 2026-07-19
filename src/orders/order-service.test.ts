import { expect, it } from 'vitest';
import { toOrderItems } from './order-service';
import type { Product } from '../types/product';

it('stores only the order snapshot needed for verification', () => {
  const products = [{ id: 'p1', brand: 'Brand', name: 'Name', priceRub: 12000 }] as Product[];
  expect(toOrderItems([{ productId: 'p1', quantity: 2 }], products)).toEqual([{ productId: 'p1', name: 'Brand Name', quantity: 2, priceRub: 12000 }]);
});
