import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { App } from '../App';

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('jardin-secret-cart-v1', JSON.stringify([{ productId: '1739-parfums-de-marly-althair', quantity: 1 }]));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) } });
});

it('keeps a selectable order when clipboard access is denied', async () => {
  window.history.pushState({}, '', '/checkout');
  render(<App />);
  await userEvent.type(screen.getByLabelText('Имя'), 'Анна');
  await userEvent.type(screen.getByLabelText('Телефон'), '+7 999 000-00-00');
  await userEvent.type(screen.getByLabelText('Город'), 'Москва');
  await userEvent.type(screen.getByLabelText('Адрес или пункт выдачи'), 'ПВЗ на Тверской');
  await userEvent.selectOptions(screen.getByLabelText('Способ доставки'), 'СДЭК');
  await userEvent.click(screen.getByRole('button', { name: 'Сформировать заказ' }));
  expect(await screen.findByText('Не удалось скопировать автоматически — выделите текст ниже')).toBeVisible();
  expect((screen.getByRole('textbox', { name: 'Готовый текст заказа' }) as HTMLTextAreaElement).value).toContain('Стоимость и наличие подтвердит менеджер.');
  expect(screen.getByRole('link', { name: 'Открыть @jardinmanager' })).toHaveAttribute('href', 'https://t.me/jardinmanager');
});
