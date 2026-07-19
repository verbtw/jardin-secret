import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import { App } from '../App';

beforeEach(() => window.localStorage.clear());

it('renders persisted items and removes them', async () => {
  window.localStorage.setItem('jardin-secret-cart-v1', JSON.stringify([{ productId: '1739-parfums-de-marly-althair', quantity: 1 }]));
  window.history.pushState({}, '', '/cart');
  render(<App />);
  expect(screen.getByText('Althaïr')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Удалить Althaïr' }));
  expect(screen.getByRole('heading', { name: 'Корзина ждёт своего аромата' })).toBeVisible();
});
