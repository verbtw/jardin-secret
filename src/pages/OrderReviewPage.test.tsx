import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { OrderReviewPage } from './OrderReviewPage';

vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../orders/order-service', () => ({ loadOrders: vi.fn().mockResolvedValue([{ id: 'o1', publicCode: 'JS-ABC123', status: 'pending', items: [], createdAt: '2026-01-01' }]) }));

it('blocks review submission for a pending order', async () => {
  render(<MemoryRouter initialEntries={['/account/orders/o1/review']}><Routes><Route path="/account/orders/:orderId/review" element={<OrderReviewPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByText('Отзыв можно оставить после выполнения заказа.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Отправить отзыв' })).not.toBeInTheDocument();
});
