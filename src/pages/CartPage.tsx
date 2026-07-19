import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProducts } from '../data/catalog';
import { useCart } from '../hooks/useCart';

const products = getProducts();
const rubles = new Intl.NumberFormat('ru-RU');

export function CartPage() {
  const cart = useCart();
  const resolved = cart.lines.map((line) => ({ line, product: products.find((item) => item.id === line.productId)! }));
  if (!resolved.length) return <main className="empty-page"><p className="eyebrow">Пока пусто</p><h1 aria-label="Корзина ждёт своего аромата">Корзина ждёт<br /><em>своего аромата</em></h1><p>Посмотрите каталог — там собраны позиции из нашего Telegram.</p><Link className="button" to="/catalog">Перейти в каталог</Link></main>;
  return (
    <main className="cart-page">
      <header className="page-heading"><p className="eyebrow">Ваш выбор</p><h1>Корзина</h1><p>Стоимость и наличие подтвердит менеджер перед оформлением.</p></header>
      <div className="cart-layout"><section className="cart-lines" aria-label="Товары в корзине">{resolved.map(({ line, product }) => <article className="cart-line" key={product.id}><img src={product.imageUrl} alt="" /><div className="cart-line__name"><small>{product.brand}</small><Link to={`/product/${product.slug}`}>{product.name}</Link><span>{product.volumeMl ? `${product.volumeMl} мл` : 'Объём уточнить'}</span></div><div className="quantity" aria-label={`Количество ${product.name}`}><button type="button" onClick={() => cart.setQuantity(product.id, line.quantity - 1)} aria-label={`Уменьшить количество ${product.name}`}><Minus size={14} /></button><span>{line.quantity}</span><button type="button" onClick={() => cart.setQuantity(product.id, line.quantity + 1)} aria-label={`Увеличить количество ${product.name}`}><Plus size={14} /></button></div><strong>{product.priceRub ? `${rubles.format(product.priceRub * line.quantity)} ₽` : 'Уточнить'}</strong><button className="remove-button" type="button" onClick={() => cart.remove(product.id)} aria-label={`Удалить ${product.name}`}><Trash2 size={17} /></button></article>)}</section>
        <aside className="cart-summary"><p className="eyebrow">Итого</p><div><span>Позиций</span><b>{cart.itemCount}</b></div><div><span>Известная сумма</span><b>{rubles.format(cart.knownSubtotal)} ₽</b></div>{cart.unknownPriceCount > 0 && <p>{cart.unknownPriceCount} поз. с ценой по запросу</p>}<Link className="button" to="/checkout">Оформить заказ <ArrowRight size={16} /></Link><button className="clear-button" type="button" onClick={cart.clear}>Очистить корзину</button></aside>
      </div>
    </main>
  );
}
