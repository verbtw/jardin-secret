import {describe, expect, it, vi} from 'vitest';
import {mapCatalogRow, loadPublicCatalog} from './catalog-service';

describe('public catalog service', () => {
  it('maps a database fragrance into the storefront model', () => {
    const product = mapCatalogRow({
      id: '1', slug: 'diptyque-philosykos-edp-75ml', brand: 'Diptyque', name: 'Philosykos',
      flanker: null, concentration: 'EDP', volume_ml: 75, retail_price_rub: 18_900,
      price_status: 'published', availability: 'in_stock', description: 'Зелёный древесный аромат.',
      fragrance_family: 'Древесные фужерные', top_notes: ['Лист инжира'], heart_notes: ['Инжир'],
      base_notes: ['Кедр'], key_notes: [], key_accords: ['зелёный'], perfumers: ['Olivia Giacobetti'],
      launch_year: 1996, image_url: 'https://example.com/image.jpg',
      details_source_url: 'https://diptyqueparis.com/example', details_status: 'verified',
      updated_at: '2026-07-21T20:00:00Z',
    });

    expect(product).toEqual(expect.objectContaining({
      priceRub: 18_900, availability: 'in-stock', concentration: 'EDP',
      topNotes: ['Лист инжира'], notes: ['Лист инжира', 'Инжир', 'Кедр'],
    }));
  });

  it('returns database products and fails closed on query errors', async () => {
    const order = vi.fn().mockResolvedValue({data: [], error: null});
    const select = vi.fn().mockReturnValue({order});
    const client = {from: vi.fn().mockReturnValue({select})};
    await expect(loadPublicCatalog(client)).resolves.toEqual([]);

    order.mockResolvedValueOnce({data: null, error: {message: 'nope'}});
    await expect(loadPublicCatalog(client)).rejects.toThrow('Не удалось загрузить каталог');
  });
});
