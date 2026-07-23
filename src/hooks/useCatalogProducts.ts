import {useEffect, useState} from 'react';
import {getProducts} from '../data/catalog';
import {loadPublicCatalog} from '../data/catalog-service';
import {mergeCatalogProducts} from '../data/merge-catalog';
import {supabase} from '../lib/supabase';
import type {Product} from '../types/product';

export interface CatalogState {
  products: Product[];
  isLoading: boolean;
}

export function useCatalogState(): CatalogState {
  const [products, setProducts] = useState(getProducts);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    loadPublicCatalog(supabase).then((next) => {
      if (active && next.length) setProducts((current) => mergeCatalogProducts(current, next));
    }).catch(() => {
      // The curated local catalog keeps the storefront usable during a transient API outage.
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  return {products, isLoading};
}

export function useCatalogProducts() {
  return useCatalogState().products;
}
