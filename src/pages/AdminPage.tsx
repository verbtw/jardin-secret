import {useEffect, useMemo, useState, type FormEvent} from 'react';
import {
  loadAdminCatalog, loadAdminImportReview, loadAdminOrders, loadAdminReviews, saveAdminProduct,
  setAdminOrderStatus, setAdminReviewStatus, type AdminOrder, type AdminProduct,
  type AdminImportReviewRow, type AdminReview,
} from '../admin/admin-service';

const money = new Intl.NumberFormat('ru-RU');
const split = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export function AdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [importReview, setImportReview] = useState<AdminImportReviewRow[]>([]);
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Загружаем данные…');

  async function refresh() {
    try {
      const [nextProducts, nextOrders, nextReviews, nextImportReview] = await Promise.all([
        loadAdminCatalog(), loadAdminOrders(), loadAdminReviews(), loadAdminImportReview(),
      ]);
      setProducts(nextProducts); setOrders(nextOrders); setReviews(nextReviews); setImportReview(nextImportReview); setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось открыть админ-панель');
    }
  }

  useEffect(() => { void refresh(); }, []);
  const visibleProducts = useMemo(() => {
    const normalized = query.toLocaleLowerCase('ru-RU').trim();
    if (!normalized) return products;
    return products.filter((product) => `${product.brand} ${product.name} ${product.volume_ml}`.toLocaleLowerCase('ru-RU').includes(normalized));
  }, [products, query]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setStatus('Сохраняем…');
    try {
      await saveAdminProduct(selected.id, {
        brand: selected.brand, name: selected.name, flanker: selected.flanker,
        concentration: selected.concentration, volume_ml: Number(selected.volume_ml),
        availability: selected.availability, description: selected.description,
        fragrance_family: selected.fragrance_family, top_notes: selected.top_notes,
        heart_notes: selected.heart_notes, base_notes: selected.base_notes,
        image_url: selected.image_url, details_status: selected.details_status,
        published: selected.published, price_mode: selected.price_mode,
        manual_price_rub: selected.price_mode === 'manual' ? selected.manual_price_rub : null,
        price_status: selected.price_mode === 'manual' && selected.manual_price_rub ? 'published' : selected.price_status,
      });
      setStatus('Сохранено.'); await refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Ошибка сохранения'); }
  }

  function change<K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) {
    setSelected((current) => current ? {...current, [key]: value} : current);
  }

  return <main className="admin-page">
    <header className="page-heading"><p className="eyebrow">Jardin Secret · управление</p><h1>Админ-панель</h1><p>Каталог, цены, заказы и отзывы в одном месте.</p></header>
    {status && <p className="admin-status" aria-live="polite">{status}</p>}
    <section className="admin-section">
      <div className="admin-section__heading"><div><p className="eyebrow">Каталог</p><h2>Ароматы · {products.length}</h2></div><input type="search" placeholder="Бренд, аромат или объём" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="admin-catalog-layout">
        <div className="admin-product-list">{visibleProducts.map((product) => <button type="button" className={selected?.id === product.id ? 'active' : ''} key={product.id} onClick={() => setSelected({...product})}><span><strong>{product.brand} · {product.name}</strong><small>{product.concentration} · {product.volume_ml} мл</small></span><span><b>{product.price_mode === 'manual' ? 'Ручная' : 'Авто'}</b><small>{product.published ? 'На сайте' : 'Скрыт'}</small></span></button>)}</div>
        {selected ? <form className="admin-editor" onSubmit={save}>
          <div className="admin-editor__title"><div><p className="eyebrow">Редактирование</p><h3>{selected.brand} {selected.name}</h3></div><button type="button" onClick={() => setSelected(null)}>Закрыть</button></div>
          <div className="admin-metrics"><span><small>Себестоимость</small>{selected.cost_rub ? `${money.format(selected.cost_rub)} ₽` : '—'}</span><span><small>Конкурент</small>{selected.competitor_rub ? `${money.format(selected.competitor_rub)} ₽` : '—'}</span><span><small>Прибыль</small>{selected.calculated_profit_rub ? `${money.format(selected.calculated_profit_rub)} ₽` : '—'}</span><span><small>Правило</small>{selected.pricing_rule || '—'}</span></div>
          <div className="form-grid"><AdminField label="Бренд" value={selected.brand} onChange={(value) => change('brand', value)} /><AdminField label="Название" value={selected.name} onChange={(value) => change('name', value)} /><AdminField label="Фланкер" value={selected.flanker ?? ''} onChange={(value) => change('flanker', value || null)} /><AdminField label="Концентрация" value={selected.concentration ?? ''} onChange={(value) => change('concentration', value || null)} /><AdminField label="Объём, мл" type="number" value={String(selected.volume_ml)} onChange={(value) => change('volume_ml', Number(value))} /><AdminField label="Семейство" value={selected.fragrance_family ?? ''} onChange={(value) => change('fragrance_family', value || null)} /><AdminField wide label="Изображение URL" value={selected.image_url ?? ''} onChange={(value) => change('image_url', value || null)} /><AdminArea label="Описание" value={selected.description} onChange={(value) => change('description', value)} /><AdminArea label="Верхние ноты через запятую" value={selected.top_notes.join(', ')} onChange={(value) => change('top_notes', split(value))} /><AdminArea label="Ноты сердца через запятую" value={selected.heart_notes.join(', ')} onChange={(value) => change('heart_notes', split(value))} /><AdminArea label="Базовые ноты через запятую" value={selected.base_notes.join(', ')} onChange={(value) => change('base_notes', split(value))} /></div>
          <div className="admin-options"><label>Цена <select value={selected.price_mode} onChange={(event) => change('price_mode', event.target.value as AdminProduct['price_mode'])}><option value="auto">Автоматическая</option><option value="manual">Ручная</option></select></label>{selected.price_mode === 'manual' && <label>Цена, ₽ <input required min="1" type="number" value={selected.manual_price_rub ?? ''} onChange={(event) => change('manual_price_rub', event.target.value ? Number(event.target.value) : null)} /></label>}<label>Наличие <select value={selected.availability} onChange={(event) => change('availability', event.target.value as AdminProduct['availability'])}><option value="in_stock">В наличии</option><option value="out_of_stock">Нет в наличии</option><option value="review">Проверить</option></select></label><label className="admin-check"><input type="checkbox" checked={selected.published} onChange={(event) => change('published', event.target.checked)} /> Показывать на сайте</label></div>
          <div className="admin-editor__actions"><button className="button" type="submit">Сохранить</button>{selected.price_mode === 'manual' && <button className="button button--outline" type="button" onClick={() => { change('price_mode', 'auto'); change('manual_price_rub', null); }}>Вернуть автообновление</button>}</div>
        </form> : <div className="admin-placeholder">Выберите аромат для редактирования</div>}
      </div>
    </section>
    <section className="admin-section"><p className="eyebrow">Импорт · требует внимания</p><h2>Неопознанные позиции · {importReview.length}</h2><div className="admin-operations">{importReview.slice(0, 100).map((row) => <article key={row.id}><div><strong>{row.source_row}</strong><small>Поставщик {row.supplier_code} · {money.format(row.cost_rub)} ₽</small></div><span>{row.parse_reason}</span></article>)}</div></section>
    <section className="admin-section"><p className="eyebrow">Заказы</p><h2>Работа с заказами</h2><div className="admin-operations">{orders.length ? orders.map((order) => <article key={order.id}><div><strong>{order.public_code}</strong><small>{new Date(order.created_at).toLocaleDateString('ru-RU')}</small><p>{order.items.map((item) => item.name).filter(Boolean).join(', ') || 'Состав заказа'}</p></div><select value={order.status} onChange={async (event) => { await setAdminOrderStatus(order.id, event.target.value as AdminOrder['status']); await refresh(); }}><option value="pending">В работе</option><option value="completed">Выполнен</option><option value="cancelled">Отменён</option></select></article>) : <p>Заказов пока нет.</p>}</div></section>
    <section className="admin-section"><p className="eyebrow">Отзывы</p><h2>Модерация</h2><div className="admin-operations">{reviews.length ? reviews.map((review) => <article key={review.id}><div><strong>{'★'.repeat(review.rating)}</strong><small>{new Date(review.created_at).toLocaleDateString('ru-RU')}</small><p>{review.body}</p></div><select value={review.status} onChange={async (event) => { await setAdminReviewStatus(review.id, event.target.value as AdminReview['status']); await refresh(); }}><option value="pending">На проверке</option><option value="published">Опубликовать</option><option value="rejected">Отклонить</option></select></article>) : <p>Новых отзывов нет.</p>}</div></section>
  </main>;
}

function AdminField({label, value, onChange, type = 'text', wide = false}: {label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean}) { return <label className={`field ${wide ? 'field--wide' : ''}`}><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function AdminArea({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) { return <label className="field field--wide"><span>{label}</span><textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
