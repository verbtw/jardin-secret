import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { App } from '../App';

beforeEach(() => window.localStorage.clear());

it.each([
  ['/originality', 'Только оригинальная парфюмерия'],
  ['/delivery', 'Доставка по России и СНГ'],
  ['/contacts', 'Мы на связи'],
])('renders %s as a real information page', (path, heading) => {
  window.history.pushState({}, '', path);
  render(<App />);
  expect(screen.getByRole('heading', { name: heading })).toBeVisible();
});
