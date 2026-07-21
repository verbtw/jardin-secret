import type { Product } from '../types/product';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products, onReset }: { products: Product[]; onReset: () => void }) {
  if (!products.length) {
    return (
      <div className="empty-state">
        <p className="eyebrow">Ничего не найдено</p>
        <h2>В саду такого аромата пока нет</h2>
        <p>Сбросьте фильтры или напишите менеджеру — возможно, аромат уже можно привезти.</p>
        <button className="button button--outline" type="button" onClick={onReset}>Сбросить фильтры</button>
      </div>
    );
  }
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}
