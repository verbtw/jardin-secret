import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { getProducts } from '../data/catalog';
import { ProductPage } from './ProductPage';

const {useCatalogState} = vi.hoisted(() => ({useCatalogState: vi.fn()}));
vi.mock('../hooks/useCatalogProducts', () => ({useCatalogState}));

beforeEach(() => {
  useCatalogState.mockReturnValue({products: getProducts(), isLoading: false});
});

it('opens Telegram with the current product already named', () => {
  const product = getProducts()[0];
  render(<MemoryRouter initialEntries={[`/product/${product.slug}`]}><Routes><Route path="/product/:slug" element={<ProductPage />} /></Routes></MemoryRouter>);
  expect(screen.getByTestId('product-image')).toHaveClass('product-image--detail');
  expect(screen.getByRole('img', {name: `${product.brand} ${product.name}`})).toHaveAttribute('loading', 'eager');
  const link = screen.getByRole('link', {name: 'Написать менеджеру'});
  const text = new URL(link.getAttribute('href')!).searchParams.get('text');
  expect(text).toContain(`${product.brand} ${product.name}`);
  expect(text).toContain(`/product/${product.slug}`);
  expect(screen.getByText(product.brand)).toHaveClass('product-brand-text');
  expect(screen.getByRole('heading', {name: product.name})).toHaveClass('product-name-text');
  expect(screen.queryByRole('button', {name: /Добавить в корзину/})).not.toBeInTheDocument();
});

it('shows a loading state instead of a false 404 while the remote product is loading', () => {
  useCatalogState.mockReturnValue({products: getProducts(), isLoading: true});
  render(<MemoryRouter initialEntries={['/product/remote-scent-edp-50ml']}><Routes><Route path="/product/:slug" element={<ProductPage />} /></Routes></MemoryRouter>);

  expect(screen.getByText('Загружаем аромат…')).toBeInTheDocument();
  expect(screen.queryByText('Аромат не найден')).not.toBeInTheDocument();
});
