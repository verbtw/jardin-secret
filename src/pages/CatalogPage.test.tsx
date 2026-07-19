import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { it, expect } from 'vitest';
import { CatalogPage } from './CatalogPage';

it('filters cards and offers a reset when nothing matches', async () => {
  render(<MemoryRouter><CatalogPage /></MemoryRouter>);
  await userEvent.type(screen.getByRole('searchbox', { name: 'Поиск ароматов' }), 'несуществующий аромат');
  expect(screen.getByText('В саду такого аромата пока нет')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
  expect(screen.getAllByTestId('product-card').length).toBeGreaterThan(0);
});
