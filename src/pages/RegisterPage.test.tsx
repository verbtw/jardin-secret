import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

const signUp = vi.fn();
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ signUp, configured: true }) }));

it('rejects different passwords before calling signUp', async () => {
  render(<MemoryRouter><RegisterPage /></MemoryRouter>);
  await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com');
  await userEvent.type(screen.getByLabelText('Пароль'), 'long-password');
  await userEvent.type(screen.getByLabelText('Повторите пароль'), 'different-password');
  await userEvent.click(screen.getByLabelText(/Согласен/));
  await userEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
  expect(screen.getByText('Пароли не совпадают.')).toBeVisible();
  expect(signUp).not.toHaveBeenCalled();
});
