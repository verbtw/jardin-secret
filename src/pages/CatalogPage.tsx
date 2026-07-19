import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CatalogControls } from '../components/CatalogControls';
import { ProductGrid } from '../components/ProductGrid';
import { getProducts } from '../data/catalog';
import { filterProducts, type CatalogQuery, type CatalogSort } from '../domain/catalog';
import type { ProductAvailability, ProductGender } from '../types/product';

const allProducts = getProducts();
const brands = [...new Set(allProducts.map((product) => product.brand))].sort((a, b) => a.localeCompare(b));

function queryFromParams(params: URLSearchParams): CatalogQuery {
  return {
    search: params.get('q') ?? '',
    brand: params.get('brand') ?? '',
    gender: (params.get('gender') ?? '') as ProductGender | '',
    availability: (params.get('stock') ?? '') as ProductAvailability | '',
    sort: (params.get('sort') ?? 'newest') as CatalogSort,
  };
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const query = queryFromParams(params);
  const products = useMemo(() => filterProducts(allProducts, query), [params.toString()]);

  function update(next: CatalogQuery) {
    const output = new URLSearchParams();
    if (next.search) output.set('q', next.search);
    if (next.brand) output.set('brand', next.brand);
    if (next.gender) output.set('gender', next.gender);
    if (next.availability) output.set('stock', next.availability);
    if (next.sort && next.sort !== 'newest') output.set('sort', next.sort);
    setParams(output, { replace: true });
  }

  return (
    <main className="page catalog-page">
      <header className="page-heading">
        <p className="eyebrow">114 ароматов из нашего Telegram</p>
        <h1>Найдите свой аромат</h1>
        <p>Оригинальная парфюмерия без наценки крупных сетей. Стоимость и наличие подтвердит менеджер.</p>
      </header>
      <CatalogControls query={query} brands={brands} onChange={update} onReset={() => setParams({}, { replace: true })} />
      <p className="result-count" aria-live="polite">Найдено: {products.length}</p>
      <ProductGrid products={products} onReset={() => setParams({}, { replace: true })} />
    </main>
  );
}
