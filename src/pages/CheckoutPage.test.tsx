import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from '../App';

it('redirects the retired checkout route because orders go through Telegram', async () => {
  window.history.pushState({}, '', '/checkout');
  render(<App />);
  expect(await screen.findByRole('heading', {name: 'Найдите свой аромат'})).toBeVisible();
  expect(screen.queryByRole('button', {name: 'Сформировать заказ'})).not.toBeInTheDocument();
});
