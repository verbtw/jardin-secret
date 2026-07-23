import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getProducts} from '../data/catalog';
import {mergeCatalogProducts} from '../data/merge-catalog';
import type {Product} from '../types/product';
import {useCatalogState} from './useCatalogProducts';

const {loadPublicCatalog} = vi.hoisted(() => ({loadPublicCatalog: vi.fn()}));

vi.mock('../data/catalog-service', () => ({loadPublicCatalog}));
vi.mock('../lib/supabase', () => ({supabase: {from: vi.fn()}}));

describe('useCatalogProducts', () => {
  beforeEach(() => loadPublicCatalog.mockReset());

  it('keeps the curated catalog when Supabase has no published products yet', async () => {
    loadPublicCatalog.mockResolvedValue([]);
    const {result} = renderHook(() => useCatalogState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(loadPublicCatalog).toHaveBeenCalledOnce();
    expect(result.current.products).not.toHaveLength(0);
  });

  it('keeps old routes available after the remote catalog finishes loading', async () => {
    const remote: Product = {
      id: 'remote-1', slug: 'remote-scent-edp-50ml', brand: 'Remote', name: 'Scent',
      concentration: 'EDP', volumeMl: 50, priceRub: 10_000, gender: 'unknown',
      availability: 'in-stock', description: 'Подробное описание аромата из проверенного каталога.',
      notes: ['Бергамот'], keyNotes: ['Бергамот'], imageUrl: '/remote.jpg', sourceUrl: '',
      sourcePostId: 0, publishedAt: null,
    };
    loadPublicCatalog.mockResolvedValue([remote]);
    const oldSlug = getProducts()[0].slug;
    const {result} = renderHook(() => useCatalogState());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products.some((product) => product.slug === oldSlug)).toBe(true);
    expect(result.current.products.some((product) => product.slug === remote.slug)).toBe(true);
  });

  it('fills an old route with verified details when the remote variant has another slug', () => {
    const local: Product = {
      id: 'old', slug: 'tom-ford-oud-wood', brand: 'Tom Ford', name: 'Oud Wood',
      volumeMl: null, priceRub: 20_000, gender: 'unknown', availability: 'ask-manager',
      description: '', notes: [], imageUrl: '/products/placeholder.svg', sourceUrl: '',
      sourcePostId: 1, publishedAt: null,
    };
    const remote: Product = {
      ...local, id: 'remote', slug: 'tom-ford-oud-wood-edp-50ml', volumeMl: 50,
      description: 'Древесно-пряный аромат с выразительным удом и мягким сандалом.',
      notes: ['Уд', 'Сандал'], keyNotes: ['Уд', 'Сандал'], imageUrl: 'https://example.test/oud-wood.jpg',
    };

    const merged = mergeCatalogProducts([local], [remote]);
    expect(merged.find((product) => product.slug === local.slug)).toMatchObject({
      description: remote.description,
      keyNotes: remote.keyNotes,
      imageUrl: remote.imageUrl,
    });
  });

  it('does not copy details between gendered variants of the same fragrance line', () => {
    const local: Product = {
      id: 'old-woman', slug: 'amouage-honour-woman', brand: 'Amouage', name: 'Honour Woman',
      volumeMl: null, priceRub: 20_000, gender: 'women', availability: 'ask-manager',
      description: '', notes: [], imageUrl: '/woman.jpg', sourceUrl: '', sourcePostId: 1, publishedAt: null,
    };
    const remote: Product = {
      ...local, id: 'remote-man', slug: 'amouage-honour-man-edp-100ml', name: 'Honour Man',
      gender: 'men', description: 'Описание мужской версии.', keyNotes: ['Чёрный перец'], imageUrl: '/man.jpg',
    };

    const oldRoute = mergeCatalogProducts([local], [remote]).find((product) => product.slug === local.slug);
    expect(oldRoute).toMatchObject({description: '', imageUrl: '/woman.jpg'});
  });
});
