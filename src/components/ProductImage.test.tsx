import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { ProductImage } from './ProductImage';

it('uses the shared card frame and lazy loading', () => {
  render(<ProductImage src="/bottle.jpg" alt="Maison Test Scent" variant="card" />);

  expect(screen.getByTestId('product-image')).toHaveClass('product-image--card');
  expect(screen.getByRole('img', {name: 'Maison Test Scent'})).toHaveAttribute('loading', 'lazy');
});

it('loads the detail image eagerly', () => {
  render(<ProductImage src="/bottle.jpg" alt="Maison Test Scent" variant="detail" />);

  expect(screen.getByRole('img', {name: 'Maison Test Scent'})).toHaveAttribute('loading', 'eager');
});

it('falls back to the branded placeholder once when an image fails', () => {
  render(<ProductImage src="/broken.jpg" alt="Maison Test Scent" variant="compact" />);
  const image = screen.getByRole('img', {name: 'Maison Test Scent'});

  fireEvent.error(image);

  expect(image).toHaveAttribute('src', '/products/placeholder.svg');
});

it('keeps every image contained inside the shared studio surface', () => {
  const css = readFileSync(`${process.cwd()}/src/product-images.css`, 'utf8');

  expect(css).toMatch(/\.product-image__media[^}]*object-fit:\s*contain/);
  expect(css).toMatch(/\.product-image--card/);
  expect(css).toMatch(/\.product-image--detail/);
  expect(css).toMatch(/\.product-image--compact/);
});
