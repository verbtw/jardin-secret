import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage } from '../auth/auth-errors';
import { loadProfile, saveProfile, type CustomerProfile } from '../auth/profile-service';
import { loadOrders, type CustomerOrder } from '../orders/order-service';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [status, setStatus] = useState('');
  useEffect(() => { if (user) { loadProfile(user.id).then(setProfile).catch((error) => setStatus(authErrorMessage(error))); loadOrders(user.id).then(setOrders).catch(() => undefined); } }, [user]);
  if (!user) return null;
  if (!profile) return <main className="empty-page"><p className="eyebrow">Личный кабинет</p><h1>Загружаем профиль…</h1><p>{status}</p></main>;
  function change(field: keyof Omit<CustomerProfile, 'id'>, value: string) { setProfile((current) => current ? { ...current, [field]: value } : current); }
  async function submit(event: FormEvent) { event.preventDefault(); setStatus('Сохраняем…'); try { await saveProfile(profile!); setStatus('Данные сохранены.'); } catch (error) { setStatus(authErrorMessage(error)); } }
  return <main className="page account-page"><header className="page-heading"><p className="eyebrow">Личный кабинет</p><h1>Ваш профиль</h1><p>{user.email}</p></header><div className="account-layout"><div><form className="checkout-form" onSubmit={submit}><div className="form-heading"><span>01</span><h2>Контакты для заказа</h2></div><div className="form-grid"><ProfileField label="Имя" value={profile.name} onChange={(v) => change('name', v)} /><ProfileField label="Телефон" value={profile.phone} onChange={(v) => change('phone', v)} /><ProfileField label="Город" value={profile.city} onChange={(v) => change('city', v)} /><ProfileField label="Адрес или пункт выдачи" value={profile.address} onChange={(v) => change('address', v)} /></div><button className="button" type="submit">Сохранить изменения</button><p className="auth-status" aria-live="polite">{status}</p></form><section className="account-orders"><p className="eyebrow">02 · Заказы</p><h2>Ваши заказы</h2>{!orders.length ? <p>Заказы, оформленные после входа, появятся здесь.</p> : orders.map((order) => <article key={order.id}><div><strong>{order.publicCode}</strong><span>{order.items.map((item) => item.name).join(', ')}</span></div><div><span>{order.status === 'completed' ? 'Выполнен' : order.status === 'cancelled' ? 'Отменён' : 'Обрабатывается'}</span>{order.status === 'completed' && <Link className="text-link" to={`/account/orders/${order.id}/review`}>Оставить отзыв</Link>}</div></article>)}</section></div><aside className="account-aside"><p className="eyebrow">Аккаунт</p><p>Сохранённые данные подставятся при следующем оформлении заказа.</p><button className="button button--outline" type="button" onClick={() => signOut()}>Выйти</button></aside></div></main>;
}
function ProfileField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
