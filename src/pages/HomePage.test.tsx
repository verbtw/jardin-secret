import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from '../App';

it('renders the brand promise, contacts, and creator credit', () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Ваш тайный сад ароматов' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Написать менеджеру' })).toHaveAttribute('href', 'https://t.me/jardinmanager');
  expect(screen.getByText('Сайт сделал verbtw')).toBeVisible();
  expect(screen.getByRole('contentinfo')).toBeVisible();
});
