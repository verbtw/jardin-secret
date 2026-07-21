import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { ProductCard } from './ProductCard';
import type { Product } from '../types/product';

const product: Product = {
  id: 'product-1', slug: 'tom-ford-oud-wood-50', brand: 'Tom Ford', name: 'Oud Wood',
  concentration: 'EDP', volumeMl: 50, priceRub: 26_000, gender: 'unisex', availability: 'in-stock',
  description: '', notes: [], imageUrl: '/products/placeholder.svg', sourceUrl: '', sourcePostId: 1, publishedAt: null,
};

it('offers a prefilled manager message instead of a cart action', () => {
  render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
  const link = screen.getByRole('link', {name: 'Написать менеджеру о Oud Wood'});
  expect(new URL(link.getAttribute('href')!).searchParams.get('text')).toContain('Tom Ford Oud Wood, EDP, 50 мл');
  expect(screen.queryByRole('button', {name: /Добавить/})).not.toBeInTheDocument();
});
