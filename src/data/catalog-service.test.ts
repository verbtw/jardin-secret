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
    const range = vi.fn().mockResolvedValue({data: [], error: null});
    const order = vi.fn().mockReturnValue({range});
    const select = vi.fn().mockReturnValue({order});
    const client = {from: vi.fn().mockReturnValue({select})};
    await expect(loadPublicCatalog(client)).resolves.toEqual([]);

    range.mockResolvedValueOnce({data: null, error: {message: 'nope'}});
    await expect(loadPublicCatalog(client)).rejects.toThrow('Не удалось загрузить каталог');
  });

  it('loads every PostgREST page instead of stopping at the first 1000 products', async () => {
    const row = {
      id: '1', slug: 'sample-edp-50ml', brand: 'Sample', name: 'Scent', flanker: null,
      concentration: 'EDP', volume_ml: 50, retail_price_rub: 10_000, price_status: 'published' as const,
      availability: 'in_stock' as const, description: 'Описание аромата достаточной длины для карточки магазина.',
      fragrance_family: 'Древесные', top_notes: ['Бергамот'], heart_notes: [], base_notes: [],
      key_notes: [], key_accords: [], perfumers: [], launch_year: null,
      image_url: 'https://example.com/image.jpg', details_source_url: 'https://example.com/source',
      details_status: 'verified', updated_at: '2026-07-23T00:00:00Z',
    };
    const range = vi.fn()
      .mockResolvedValueOnce({data: Array.from({length: 1000}, (_, id) => ({...row, id: String(id)})), error: null})
      .mockResolvedValueOnce({data: [{...row, id: '1000'}], error: null});
    const client = {from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({order: vi.fn().mockReturnValue({range})}),
    })};

    await expect(loadPublicCatalog(client)).resolves.toHaveLength(1001);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});
