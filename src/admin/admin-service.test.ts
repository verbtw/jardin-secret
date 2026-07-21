import {describe, expect, it, vi} from 'vitest';
import {loadAdminCatalog, saveAdminProduct} from './admin-service';

describe('admin service', () => {
  it('loads the guarded catalog dashboard', async () => {
    const rpc = vi.fn().mockResolvedValue({data: [{id: '1'}], error: null});
    await expect(loadAdminCatalog({rpc})).resolves.toEqual([{id: '1'}]);
    expect(rpc).toHaveBeenCalledWith('admin_catalog_dashboard');
  });

  it('saves only the editable product fields', async () => {
    const eq = vi.fn().mockResolvedValue({error: null});
    const update = vi.fn().mockReturnValue({eq});
    const client = {from: vi.fn().mockReturnValue({update})};

    await saveAdminProduct(client, 'product-1', {
      description: 'Описание', top_notes: ['Бергамот'], manual_price_rub: 20_000,
      price_mode: 'manual', price_status: 'published', published: true,
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({description: 'Описание', manual_price_rub: 20_000}));
    expect(eq).toHaveBeenCalledWith('id', 'product-1');
  });
});
