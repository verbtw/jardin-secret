import { ArrowLeft, ExternalLink, ShoppingBag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getProducts } from '../data/catalog';
import { getOrderReadiness } from '../domain/catalog';
import { useCart } from '../hooks/useCart';

const products = getProducts();
const rubles = new Intl.NumberFormat('ru-RU');

export function ProductPage() {
  const { slug } = useParams();
  const product = products.find((item) => item.slug === slug);
  const { add } = useCart();
  if (!product) return <main className="empty-page"><p className="eyebrow">404</p><h1>Аромат не найден</h1><Link className="button" to="/catalog">Вернуться в каталог</Link></main>;
  const orderReadiness = getOrderReadiness(product);
  return (
    <main className="product-page">
      <Link className="back-link" to="/catalog"><ArrowLeft size={16} />Назад в каталог</Link>
      <div className="product-detail">
        <div className="product-detail__image"><img src={product.imageUrl} alt={`${product.brand} ${product.name}`} onError={(event) => { event.currentTarget.src = '/products/placeholder.svg'; }} /></div>
        <div className="product-detail__copy">
          <p className="eyebrow">{product.brand}</p><h1>{product.name}</h1>
          <p className="product-detail__price">{product.priceRub ? `${rubles.format(product.priceRub)} ₽` : 'Цену уточнит менеджер'}</p>
          <div className="detail-facts"><span><small>Объём</small>{product.volumeMl ? `${product.volumeMl} мл` : 'Уточнить'}</span><span><small>Наличие</small>{product.availability === 'in-stock' ? 'В наличии' : 'Уточнить'}</span><span><small>Оригинальность</small>100% оригинал</span></div>
          {product.description && <p className="product-description">{product.description}</p>}
          <p className="price-note">Цена и наличие указаны по публикации канала и подтверждаются менеджером перед заказом.</p>
          <div className="detail-actions">{orderReadiness.ready ? <button className="button" type="button" onClick={() => add(product.id)}><ShoppingBag size={17} />Добавить в корзину</button> : <a className="button" href="https://t.me/jardinmanager" target="_blank" rel="noreferrer">Уточнить у менеджера</a>}<a className="button button--outline" href="https://t.me/jardinmanager" target="_blank" rel="noreferrer">Заказать в Telegram</a></div>
          <a className="source-link" href={product.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Открыть исходную публикацию</a>
        </div>
      </div>
    </main>
  );
}
