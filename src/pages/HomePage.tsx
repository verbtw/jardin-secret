import { ArrowRight, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { ProductGrid } from '../components/ProductGrid';
import { TrustStrip } from '../components/TrustStrip';
import { getProducts } from '../data/catalog';
import { useCart } from '../hooks/useCart';

const products = getProducts();

export function HomePage() {
  const { add } = useCart();
  return (
    <main>
      <Hero />
      <TrustStrip />
      <section className="home-catalog section-wrap">
        <div className="section-heading"><div><p className="eyebrow">Сейчас в саду</p><h2>Ароматы, которые<br /><em>хочется носить</em></h2></div><Link className="text-link" to="/catalog">Все 114 ароматов <ArrowRight size={16} /></Link></div>
        <ProductGrid products={products.slice(0, 8)} onReset={() => undefined} onAdd={add} />
      </section>
      <section className="story-section section-wrap">
        <div className="story-copy"><p className="eyebrow">Jardin Secret</p><h2>Не просто витрина.<br /><em>Ваш проводник.</em></h2><p>Подбираем аромат под характер, сезон и повод. Отвечаем на вопросы до покупки и остаёмся рядом после неё.</p><a className="button button--light" href="https://t.me/jardinmanager" target="_blank" rel="noreferrer"><Send size={16} />Получить подборку</a></div>
        <div className="story-numbers"><div><strong>4 000+</strong><span>читателей канала</span></div><div><strong>1 259</strong><span>публикаций изучено</span></div><div><strong>114</strong><span>ароматов в каталоге</span></div><div><strong>РФ + СНГ</strong><span>география доставки</span></div></div>
      </section>
      <section className="delivery-section section-wrap" id="delivery"><div><p className="eyebrow">Доставка</p><h2>Бережно упакуем.<br /><em>Доставим к вам.</em></h2></div><div><p>Отправляем оригинальную парфюмерию по России и странам СНГ. Сроки и стоимость зависят от города — менеджер рассчитает лучший вариант.</p><a className="text-link" href="https://t.me/jardinmanager" target="_blank" rel="noreferrer">Узнать условия <ArrowRight size={16} /></a></div></section>
    </main>
  );
}
