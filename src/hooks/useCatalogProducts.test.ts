import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useCatalogProducts} from './useCatalogProducts';

const {loadPublicCatalog} = vi.hoisted(() => ({loadPublicCatalog: vi.fn()}));

vi.mock('../data/catalog-service', () => ({loadPublicCatalog}));
vi.mock('../lib/supabase', () => ({supabase: {from: vi.fn()}}));

describe('useCatalogProducts', () => {
  beforeEach(() => loadPublicCatalog.mockReset());

  it('keeps the curated catalog when Supabase has no published products yet', async () => {
    loadPublicCatalog.mockResolvedValue([]);
    const {result} = renderHook(() => useCatalogProducts());

    await waitFor(() => expect(loadPublicCatalog).toHaveBeenCalledOnce());
    expect(result.current).not.toHaveLength(0);
  });
});
