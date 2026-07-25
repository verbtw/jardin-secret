import { Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildManagerUrl } from '../domain/telegram-order';
import type { Product } from '../types/product';
import { ProductImage } from './ProductImage';

const rubles = new Intl.NumberFormat('ru-RU');

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card" data-testid="product-card">
      <Link className="product-card__image" to={`/product/${product.slug}`} aria-label={`${product.brand} ${product.name}`}>
        <ProductImage src={product.imageUrl} alt={`${product.brand} ${product.name}`} variant="card" />
      </Link>
      <div className="product-card__body">
        <p className="product-card__brand">{product.brand}</p>
        <h3><Link to={`/product/${product.slug}`}>{product.name}</Link></h3>
        <p className="product-card__meta">{product.volumeMl ? `${product.volumeMl} мл` : 'Объём уточнить'}</p>
        <div className="product-card__bottom">
          <strong>{product.priceRub ? `${rubles.format(product.priceRub)} ₽` : 'Уточнить'}</strong>
          <a className="icon-button" href={buildManagerUrl(product, window.location.origin)} target="_blank" rel="noreferrer" aria-label={`Написать менеджеру о ${product.name}`}><Send size={16} /></a>
        </div>
      </div>
    </article>
  );
}
