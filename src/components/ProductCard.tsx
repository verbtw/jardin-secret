import { ExternalLink, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getOrderReadiness } from '../domain/catalog';
import type { Product } from '../types/product';

const rubles = new Intl.NumberFormat('ru-RU');

export function ProductCard({ product, onAdd }: { product: Product; onAdd?: (productId: string) => void }) {
  const orderReadiness = getOrderReadiness(product);
  return (
    <article className="product-card" data-testid="product-card">
      <Link className="product-card__image" to={`/product/${product.slug}`} aria-label={`${product.brand} ${product.name}`}>
        <img src={product.imageUrl} alt={`${product.brand} ${product.name}`} loading="lazy" onError={(event) => { event.currentTarget.src = '/products/placeholder.svg'; }} />
        <span className="product-card__source" title="Из Telegram"><ExternalLink size={14} aria-hidden="true" /></span>
      </Link>
      <div className="product-card__body">
        <p className="product-card__brand">{product.brand}</p>
        <h3><Link to={`/product/${product.slug}`}>{product.name}</Link></h3>
        <p className="product-card__meta">{product.volumeMl ? `${product.volumeMl} мл` : 'Объём уточнить'}</p>
        <div className="product-card__bottom">
          <strong>{product.priceRub ? `${rubles.format(product.priceRub)} ₽` : 'Уточнить'}</strong>
          {onAdd && orderReadiness.ready && <button className="icon-button" type="button" onClick={() => onAdd(product.id)} aria-label={`Добавить ${product.name} в корзину`}><Plus size={18} /></button>}
          {onAdd && !orderReadiness.ready && <a className="icon-button" href="https://t.me/jardinmanager" target="_blank" rel="noreferrer" aria-label={`Уточнить цену и объём ${product.name} у менеджера`}><ExternalLink size={16} /></a>}
        </div>
      </div>
    </article>
  );
}
