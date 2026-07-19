import { expect, it } from 'vitest';
import { cartReducer } from './cart';

it('adds the same product by incrementing quantity', () => {
  const once = cartReducer([], { type: 'add', productId: '1739' });
  const twice = cartReducer(once, { type: 'add', productId: '1739' });
  expect(twice).toEqual([{ productId: '1739', quantity: 2 }]);
});

it('removes zero-quantity lines', () => {
  expect(cartReducer([{ productId: '1739', quantity: 1 }], { type: 'set', productId: '1739', quantity: 0 })).toEqual([]);
});

it('clamps quantities to twenty', () => {
  expect(cartReducer([], { type: 'set', productId: '1739', quantity: 100 })).toEqual([{ productId: '1739', quantity: 20 }]);
});
