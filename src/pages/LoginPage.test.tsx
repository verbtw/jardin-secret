import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const signIn = vi.fn().mockResolvedValue(undefined);
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ signIn, configured: true, user: null }) }));

it('signs in with email and password', async () => {
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com');
  await userEvent.type(screen.getByLabelText('Пароль'), 'long-password');
  await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
  expect(signIn).toHaveBeenCalledWith('buyer@example.com', 'long-password');
});
