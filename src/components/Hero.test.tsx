import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {expect, it} from 'vitest';
import {Hero} from './Hero';

it('uses the rotating real-perfume showcase instead of the decorative lifestyle photo', () => {
  render(<MemoryRouter><Hero /></MemoryRouter>);

  expect(screen.getByTestId('hero-media')).toHaveAttribute('aria-label', 'Выбранные ароматы');
  expect(screen.getByRole('img', {name: 'Nishane Hacivat'})).toBeVisible();
  expect(screen.queryByRole('presentation', {hidden: true})).not.toBeInTheDocument();
  expect(document.querySelector('.perfume-bottle')).not.toBeInTheDocument();
  expect(document.querySelector('.glass-orb')).not.toBeInTheDocument();
});
