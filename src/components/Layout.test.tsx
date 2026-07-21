import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { CartProvider } from '../hooks/useCart';
import { Layout } from './Layout';

it('keeps account access but removes the obsolete cart from the header', () => {
  render(<AuthProvider><CartProvider><MemoryRouter><Routes><Route element={<Layout />}><Route index element={<main>Главная</main>} /></Route></Routes></MemoryRouter></CartProvider></AuthProvider>);
  expect(screen.getByRole('link', {name: 'Войти в аккаунт'})).toBeInTheDocument();
  expect(screen.queryByRole('link', {name: /Корзина/})).not.toBeInTheDocument();
});
