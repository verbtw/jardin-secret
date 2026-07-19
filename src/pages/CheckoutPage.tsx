import { Check, Clipboard, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../data/catalog';
import { getOrderReadiness } from '../domain/catalog';
import { formatOrder, validateCheckout, type CheckoutErrors, type CheckoutValues } from '../domain/order';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../auth/AuthProvider';
import { loadProfile } from '../auth/profile-service';
import { createOrder } from '../orders/order-service';

const initialValues: CheckoutValues = { name: '', phone: '', city: '', address: '', delivery: '', comment: '' };
const products = getProducts();

export function CheckoutPage() {
  const { lines } = useCart();
  const { user } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [orderText, setOrderText] = useState('');
  const [copyStatus, setCopyStatus] = useState<'copied' | 'blocked' | ''>('');
  const [accountOrder, setAccountOrder] = useState<{ id: string; publicCode: string } | null>(null);
  const [accountOrderWarning, setAccountOrderWarning] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!user) return;
    loadProfile(user.id).then((profile) => setValues((current) => Object.values(current).some(Boolean) ? current : { ...current, name: profile.name, phone: profile.phone, city: profile.city, address: profile.address })).catch(() => undefined);
  }, [user]);
  if (!lines.length) return <main className="empty-page"><p className="eyebrow">Оформление</p><h1>Сначала выберите аромат</h1><Link className="button" to="/catalog">Открыть каталог</Link></main>;
  const blockedProducts = lines
    .map((line) => products.find((product) => product.id === line.productId))
    .filter((product): product is (typeof products)[number] => Boolean(product && !getOrderReadiness(product).ready));
  if (blockedProducts.length) {
    const missing = new Set(blockedProducts.flatMap((product) => getOrderReadiness(product).missing));
    const fields = [...missing].map((item) => item === 'price' ? 'цену' : 'объём').join(' и ');
    return <main className="empty-page"><p className="eyebrow">Нужно подтверждение</p><h1>Сначала уточните детали</h1><p>Перед оформлением менеджер должен подтвердить {fields} выбранного аромата.</p><div className="detail-actions"><a className="button" href="https://t.me/jardinmanager" target="_blank" rel="noreferrer">Написать менеджеру</a><Link className="button button--outline" to="/cart">Вернуться в корзину</Link></div></main>;
  }

  function change(field: keyof CheckoutValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateCheckout(values);
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) { formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); return; }
    const text = formatOrder(values, lines, products);
    setOrderText(text);
    if (user && !accountOrder) {
      try { setAccountOrder(await createOrder(user.id, lines, products)); }
      catch { setAccountOrderWarning('Заказ не сохранился в кабинете, но сообщение для менеджера готово.'); }
    }
    try { await navigator.clipboard.writeText(text); setCopyStatus('copied'); }
    catch { setCopyStatus('blocked'); }
  }

  async function copyAgain() {
    try { await navigator.clipboard.writeText(orderText); setCopyStatus('copied'); }
    catch { setCopyStatus('blocked'); }
  }

  return (
    <main className="checkout-page">
      <header className="page-heading"><p className="eyebrow">Без онлайн-оплаты</p><h1>Оформление заказа</h1><p>Заполните контакты — сайт подготовит сообщение, а менеджер подтвердит цену, наличие и доставку.</p></header>
      <div className="checkout-layout">
        <form className="checkout-form" ref={formRef} onSubmit={submit} noValidate>
          <div className="form-heading"><span>01</span><h2>Контактные данные</h2></div>
          <div className="form-grid">
            <Field label="Имя" name="name" value={values.name} error={errors.name} onChange={(value) => change('name', value)} />
            <Field label="Телефон" name="phone" value={values.phone} error={errors.phone} onChange={(value) => change('phone', value)} inputMode="tel" />
            <Field label="Город" name="city" value={values.city} error={errors.city} onChange={(value) => change('city', value)} />
            <Field label="Адрес или пункт выдачи" name="address" value={values.address} error={errors.address} onChange={(value) => change('address', value)} />
            <label className="field"><span>Способ доставки</span><select name="delivery" value={values.delivery} onChange={(event) => change('delivery', event.target.value)} aria-invalid={Boolean(errors.delivery)}><option value="">Выберите вариант</option><option value="СДЭК">СДЭК</option><option value="Почта России">Почта России</option><option value="Курьер">Курьер</option><option value="Обсудить с менеджером">Обсудить с менеджером</option></select>{errors.delivery && <small>{errors.delivery}</small>}</label>
            <label className="field field--wide"><span>Комментарий</span><textarea name="comment" value={values.comment} onChange={(event) => change('comment', event.target.value)} rows={4} placeholder="Пожелания к заказу или доставке" /></label>
          </div>
          <button className="button checkout-submit" type="submit">Сформировать заказ <Clipboard size={17} /></button>
        </form>
        <aside className={`order-result ${orderText ? 'order-result--ready' : ''}`}>
          <p className="eyebrow">02 · Готовое сообщение</p>
          {!orderText ? <div className="order-wait"><span>JS</span><p>После заполнения здесь появится сообщение для менеджера.</p></div> : <><div className={`copy-status copy-status--${copyStatus}`}>{copyStatus === 'copied' ? <><Check size={16} />Заказ скопирован</> : <>Не удалось скопировать автоматически — выделите текст ниже</>}</div>{accountOrder && <p className="order-hint">Заказ {accountOrder.publicCode} сохранён в личном кабинете.</p>}{accountOrderWarning && <p className="order-hint">{accountOrderWarning}</p>}<label><span className="sr-only">Готовый текст заказа</span><textarea aria-label="Готовый текст заказа" readOnly value={orderText} rows={16} /></label><div className="order-actions"><button className="button button--outline" type="button" onClick={copyAgain}>Копировать ещё раз</button><a className="button" href="https://t.me/jardinmanager" target="_blank" rel="noreferrer">Открыть @jardinmanager <ExternalLink size={15} /></a></div><p className="order-hint">Вставьте скопированный текст в диалог. Сайт не отправляет сообщение автоматически.</p></>}
        </aside>
      </div>
    </main>
  );
}

function Field({ label, name, value, error, onChange, inputMode }: { label: string; name: keyof CheckoutValues; value: string; error?: string; onChange: (value: string) => void; inputMode?: 'tel' }) {
  return <label className="field"><span>{label}</span><input name={name} value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} aria-invalid={Boolean(error)} />{error && <small>{error}</small>}</label>;
}
