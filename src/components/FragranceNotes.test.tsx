import {render, screen} from '@testing-library/react';
import {expect, it} from 'vitest';
import {FragranceNotes} from './FragranceNotes';

it('renders a complete fragrance pyramid', () => {
  render(<FragranceNotes top={['Бергамот']} heart={['Кедр']} base={['Амбра']} keyNotes={[]} />);
  expect(screen.getByText('Верхние ноты')).toBeInTheDocument();
  expect(screen.getByText('Бергамот')).toBeInTheDocument();
  expect(screen.getByText('Ноты сердца')).toBeInTheDocument();
  expect(screen.getByText('Базовые ноты')).toBeInTheDocument();
});

it('renders confirmed key notes when the pyramid is unavailable', () => {
  render(<FragranceNotes top={[]} heart={[]} base={[]} keyNotes={['Уд', 'Сандал']} />);
  expect(screen.getByText('Ключевые ноты')).toBeInTheDocument();
  expect(screen.getByText('Уд, Сандал')).toBeInTheDocument();
});

it('renders nothing without confirmed notes', () => {
  const {container} = render(<FragranceNotes top={[]} heart={[]} base={[]} keyNotes={[]} />);
  expect(container).toBeEmptyDOMElement();
});
