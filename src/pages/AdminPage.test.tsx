import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, expect, it, vi} from 'vitest';
import {
  loadAdminCatalog,
  loadAdminImportReview,
  loadAdminOrders,
  loadAdminReviews,
  saveAdminProduct,
  type AdminProduct,
} from '../admin/admin-service';
import {AdminPage} from './AdminPage';

vi.mock('../admin/admin-service', () => ({
  loadAdminCatalog: vi.fn(), loadAdminImportReview: vi.fn(), loadAdminOrders: vi.fn(), loadAdminReviews: vi.fn(),
  saveAdminProduct: vi.fn(), createAdminOrder: vi.fn(), setAdminOrderStatus: vi.fn(), setAdminReviewStatus: vi.fn(),
}));

const product = {
  id: 'one', slug: 'tom-ford-oud-wood-edp-50ml', brand: 'Tom Ford', name: 'Oud Wood', flanker: null,
  concentration: 'EDP', volume_ml: 50, availability: 'in_stock', published: false,
  description: 'Описание', fragrance_family: 'Древесные', top_notes: ['Бергамот'], heart_notes: ['Уд'],
  base_notes: ['Амбра'], key_notes: ['Сандал'], key_accords: ['Древесный'], perfumers: ['Richard Herpin'],
  launch_year: 2007, image_url: 'https://cdn.example/oud.jpg', details_source_url: 'https://brand.example/oud',
  details_status: 'verified', auto_price_rub: 20_000, manual_price_rub: null, price_mode: 'auto',
  price_status: 'published', cost_rub: 15_000, competitor_rub: 24_000, calculated_profit_rub: 5_000,
  pricing_rule: 'cost_plus', pricing_flagged: false, updated_at: '2026-07-22T00:00:00Z',
} as AdminProduct;

beforeEach(() => {
  vi.mocked(loadAdminCatalog).mockResolvedValue([product]);
  vi.mocked(loadAdminImportReview).mockResolvedValue([]);
  vi.mocked(loadAdminOrders).mockResolvedValue([]);
  vi.mocked(loadAdminReviews).mockResolvedValue([]);
  vi.mocked(saveAdminProduct).mockResolvedValue(undefined);
});

it('lets the manager edit every fragrance detail required for publication', async () => {
  const user = userEvent.setup();
  render(<AdminPage />);
  await user.click(await screen.findByRole('button', {name: /Tom Ford · Oud Wood/}));

  expect(screen.getByLabelText('Ключевые ноты через запятую')).toHaveValue('Сандал');
  expect(screen.getByLabelText('Аккорды через запятую')).toHaveValue('Древесный');
  expect(screen.getByLabelText('Парфюмеры через запятую')).toHaveValue('Richard Herpin');
  expect(screen.getByLabelText('Год выпуска')).toHaveValue(2007);
  expect(screen.getByLabelText('Источник характеристик')).toHaveValue('https://brand.example/oud');

  await user.click(screen.getByRole('button', {name: 'Сохранить'}));
  expect(saveAdminProduct).toHaveBeenCalledWith('one', expect.objectContaining({
    key_notes: ['Сандал'], key_accords: ['Древесный'], perfumers: ['Richard Herpin'],
    launch_year: 2007, details_source_url: 'https://brand.example/oud', details_status: 'verified',
  }));
});
