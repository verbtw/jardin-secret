import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {expect, it} from 'vitest';
import {Hero} from './Hero';

it('uses the editorial hero image without the old branded bottle markup', () => {
  render(<MemoryRouter><Hero /></MemoryRouter>);

  expect(screen.getByTestId('hero-media')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('presentation', {hidden: true})).toHaveAttribute('src', '/hero/editorial-perfume.webp');
  expect(document.querySelector('.perfume-bottle')).not.toBeInTheDocument();
  expect(document.querySelector('.glass-orb')).not.toBeInTheDocument();
});
