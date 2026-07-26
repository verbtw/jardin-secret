import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {expect, it} from 'vitest';
import {BrandLogo} from './BrandLogo';

it('renders the approved local wordmark asset', () => {
  render(<MemoryRouter><BrandLogo /></MemoryRouter>);
  expect(screen.getByRole('link', {name: 'Jardin Secret — главная'})).toContainElement(
    screen.getByTestId('brand-logo-art'),
  );
  expect(screen.getByTestId('brand-logo-art')).toHaveClass('brand-logo__art');
});

it('uses the same asset treatment for the light version', () => {
  render(<MemoryRouter><BrandLogo light /></MemoryRouter>);
  expect(screen.getByRole('link', {name: 'Jardin Secret — главная'})).toHaveClass('brand-logo--light');
});
