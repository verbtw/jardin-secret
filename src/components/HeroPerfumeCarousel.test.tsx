import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {HeroPerfumeCarousel} from './HeroPerfumeCarousel';

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({matches: false}),
  });
});

afterEach(() => vi.useRealTimers());

function renderCarousel() {
  return render(<MemoryRouter><HeroPerfumeCarousel /></MemoryRouter>);
}

it('rotates through real perfume packshots every seven seconds', () => {
  renderCarousel();

  expect(screen.getByRole('img', {name: 'Nishane Hacivat'})).toHaveAttribute(
    'src', '/products/packshots/nishane-hacivat.jpg',
  );

  act(() => vi.advanceTimersByTime(7_000));

  expect(screen.getByRole('img', {name: 'Jean Paul Gaultier Divine Le Parfum'})).toBeVisible();
});

it('lets a shopper choose a fragrance directly', () => {
  renderCarousel();

  fireEvent.click(screen.getByRole('button', {name: 'Показать Mango Skin'}));

  expect(screen.getByRole('img', {name: 'Vilhelm Parfumerie Mango Skin'})).toBeVisible();
  expect(screen.getByRole('link', {name: 'Открыть Mango Skin'})).toHaveAttribute(
    'href', '/product/vilhelm-parfumerie-mango-skin',
  );
});

it('does not auto-rotate when reduced motion is requested', () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({matches: true}),
  });
  renderCarousel();

  act(() => vi.advanceTimersByTime(21_000));

  expect(screen.getByRole('img', {name: 'Nishane Hacivat'})).toBeVisible();
});
