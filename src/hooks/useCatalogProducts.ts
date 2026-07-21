import {useEffect, useState} from 'react';
import {getProducts} from '../data/catalog';
import {loadPublicCatalog} from '../data/catalog-service';
import {supabase} from '../lib/supabase';

export function useCatalogProducts() {
  const [products, setProducts] = useState(getProducts);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    loadPublicCatalog(supabase).then((next) => {
      if (active) setProducts(next);
    }).catch(() => {
      // The curated local catalog keeps the storefront usable during a transient API outage.
    });
    return () => { active = false; };
  }, []);

  return products;
}
