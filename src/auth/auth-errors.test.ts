import { expect, it } from 'vitest';
import { authErrorMessage } from './auth-errors';

it('maps invalid credentials to Russian copy', () => {
  expect(authErrorMessage(new Error('Invalid login credentials'))).toBe('Неверный email или пароль.');
});

it('hides unknown backend details', () => {
  expect(authErrorMessage(new Error('database exploded'))).toBe('Не удалось выполнить запрос. Попробуйте ещё раз.');
});
