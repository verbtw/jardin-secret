import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it } from 'vitest';
import { CartProvider, useCart } from './useCart';

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

beforeEach(() => window.localStorage.clear());

it('persists and restores valid cart lines', () => {
  const first = renderHook(() => useCart(), { wrapper });
  act(() => first.result.current.add('1739-parfums-de-marly-althair'));
  expect(JSON.parse(window.localStorage.getItem('jardin-secret-cart-v1') ?? '[]')).toEqual([{ productId: '1739-parfums-de-marly-althair', quantity: 1 }]);
  first.unmount();
  const restored = renderHook(() => useCart(), { wrapper });
  expect(restored.result.current.itemCount).toBe(1);
});

it('ignores malformed stored JSON', () => {
  window.localStorage.setItem('jardin-secret-cart-v1', '{broken');
  const result = renderHook(() => useCart(), { wrapper });
  expect(result.result.current.lines).toEqual([]);
});
