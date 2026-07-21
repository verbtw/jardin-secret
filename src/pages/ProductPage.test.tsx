import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it } from 'vitest';
import { getProducts } from '../data/catalog';
import { ProductPage } from './ProductPage';

it('opens Telegram with the current product already named', () => {
  const product = getProducts()[0];
  render(<MemoryRouter initialEntries={[`/product/${product.slug}`]}><Routes><Route path="/product/:slug" element={<ProductPage />} /></Routes></MemoryRouter>);
  const link = screen.getByRole('link', {name: 'Написать менеджеру'});
  const text = new URL(link.getAttribute('href')!).searchParams.get('text');
  expect(text).toContain(`${product.brand} ${product.name}`);
  expect(text).toContain(`/product/${product.slug}`);
  expect(screen.queryByRole('button', {name: /Добавить в корзину/})).not.toBeInTheDocument();
});

