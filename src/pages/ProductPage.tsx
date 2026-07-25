import { ArrowLeft, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { buildManagerUrl } from '../domain/telegram-order';
import { useCatalogState } from '../hooks/useCatalogProducts';
import { FragranceNotes } from '../components/FragranceNotes';
import { ProductImage } from '../components/ProductImage';

const rubles = new Intl.NumberFormat('ru-RU');

export function ProductPage() {
  const {products, isLoading} = useCatalogState();
  const { slug } = useParams();
  const product = products.find((item) => item.slug === slug);
  if (!product && isLoading) return <main className="empty-page"><p className="eyebrow">Каталог</p><h1>Загружаем аромат…</h1></main>;
  if (!product) return <main className="empty-page"><p className="eyebrow">404</p><h1>Аромат не найден</h1><Link className="button" to="/catalog">Вернуться в каталог</Link></main>;
  return (
    <main className="product-page">
      <Link className="back-link" to="/catalog"><ArrowLeft size={16} />Назад в каталог</Link>
      <div className="product-detail">
        <ProductImage src={product.imageUrl} alt={`${product.brand} ${product.name}`} variant="detail" className="product-detail__image" />
        <div className="product-detail__copy">
          <p className="eyebrow">{product.brand}</p><h1>{product.name}</h1>
          <p className="product-detail__price">{product.priceRub ? `${rubles.format(product.priceRub)} ₽` : 'Цену уточнит менеджер'}</p>
          <div className="detail-facts"><span><small>Объём</small>{product.volumeMl ? `${product.volumeMl} мл` : 'Уточнить'}</span><span><small>Наличие</small>{product.availability === 'in-stock' ? 'В наличии' : 'Уточнить'}</span><span><small>Оригинальность</small>100% оригинал</span></div>
          {product.description && <p className="product-description">{product.description}</p>}
          {(product.fragranceFamily || product.launchYear || product.perfumers?.length) && (
            <div className="fragrance-profile">
              {product.fragranceFamily && <p><strong>Семейство:</strong> {product.fragranceFamily}</p>}
              {product.launchYear && <p><strong>Год выпуска:</strong> {product.launchYear}</p>}
              {product.perfumers?.length ? <p><strong>Парфюмер:</strong> {product.perfumers.join(', ')}</p> : null}
            </div>
          )}
          <FragranceNotes
            top={product.topNotes ?? []}
            heart={product.heartNotes ?? []}
            base={product.baseNotes ?? []}
            keyNotes={product.keyNotes ?? []}
          />
          <p className="price-note">Актуальную цену, наличие и срок доставки менеджер подтвердит перед заказом.</p>
          <div className="detail-actions"><a className="button" href={buildManagerUrl(product, window.location.origin)} target="_blank" rel="noreferrer"><Send size={17} />Написать менеджеру</a></div>
        </div>
      </div>
    </main>
  );
}
