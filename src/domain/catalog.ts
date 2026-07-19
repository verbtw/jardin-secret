import type { Product, ProductAvailability, ProductGender } from '../types/product';

export type CatalogSort = 'newest' | 'price-asc' | 'price-desc' | 'name';

export interface CatalogQuery {
  search?: string;
  brand?: string;
  gender?: ProductGender | '';
  availability?: ProductAvailability | '';
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: CatalogSort;
}

export function filterProducts(products: Product[], query: CatalogQuery): Product[] {
  const search = query.search?.trim().toLocaleLowerCase('ru-RU') ?? '';
  const filtered = products.filter((product) => {
    const searchable = `${product.brand} ${product.name}`.toLocaleLowerCase('ru-RU');
    if (search && !searchable.includes(search)) return false;
    if (query.brand && product.brand !== query.brand) return false;
    if (query.gender && product.gender !== query.gender) return false;
    if (query.availability && product.availability !== query.availability) return false;
    if (query.minPrice != null && (product.priceRub == null || product.priceRub < query.minPrice)) return false;
    if (query.maxPrice != null && (product.priceRub == null || product.priceRub > query.maxPrice)) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (query.sort === 'name') return `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, 'ru');
    if (query.sort === 'price-asc' || query.sort === 'price-desc') {
      if (a.priceRub == null) return 1;
      if (b.priceRub == null) return -1;
      return query.sort === 'price-asc' ? a.priceRub - b.priceRub : b.priceRub - a.priceRub;
    }
    return b.sourcePostId - a.sourcePostId;
  });
}
