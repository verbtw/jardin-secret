import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ProductImage } from './ProductImage';
import productImageCss from '../product-images.css?raw';

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
  render(<ProductImage src="/portrait-bottle.jpg" alt="Tall bottle" variant="card" />);

  expect(screen.getByTestId('product-image').querySelector('.product-image__stage')).toBeInTheDocument();
  expect(productImageCss).toMatch(/\.product-image__media[^}]*object-fit:\s*contain/);
  expect(productImageCss).toMatch(/\.product-image__media[^}]*position:\s*absolute/);
  expect(productImageCss).toMatch(/\.product-image--card/);
  expect(productImageCss).toMatch(/\.product-image--detail/);
  expect(productImageCss).toMatch(/\.product-image--compact/);
});

it('presents every perfume as an unaltered packshot on a pure white background', () => {
  expect(productImageCss).toMatch(/\.product-image\s*\{[^}]*background:\s*#fff;/);
  expect(productImageCss).toMatch(/\.product-image__media[^}]*mix-blend-mode:\s*normal;/);
  expect(productImageCss).not.toMatch(/\.product-image__shadow\s*\{/);
});
