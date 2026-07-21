import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from '../App';

it('redirects the retired cart route to the manager-first catalog', async () => {
  window.history.pushState({}, '', '/cart');
  render(<App />);
  expect(await screen.findByRole('heading', {name: 'Найдите свой аромат'})).toBeVisible();
  expect(screen.queryByRole('link', {name: /Корзина/})).not.toBeInTheDocument();
});
