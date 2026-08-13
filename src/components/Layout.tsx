import { CircleUserRound, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {BrandLogo} from './BrandLogo';

const navigation = [{ to: '/catalog', label: 'Каталог' }, { to: '/originality', label: 'Оригинальность' }, { to: '/delivery', label: 'Доставка' }, { to: '/reviews', label: 'Отзывы' }, { to: '/contacts', label: 'Контакты' }];

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  return (
    <div className="site-shell">
      <header className="site-header">
        <BrandLogo />
        <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Основная навигация">
          {navigation.map((item) => <NavLink key={item.label} to={item.to} onClick={() => setMenuOpen(false)}>{item.label}</NavLink>)}
          {isAdmin && <NavLink to="/admin" onClick={() => setMenuOpen(false)}>Управление</NavLink>}
        </nav>
        <div className="header-actions">
          <Link className="cart-link account-link" to={user ? '/account' : '/login'} aria-label={user ? 'Открыть профиль' : 'Войти в аккаунт'}><CircleUserRound size={18} /><span>{user ? 'Профиль' : 'Войти'}</span></Link>
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer" id="contacts">
        <div className="footer-brand"><BrandLogo light /><p>Оригинальная парфюмерия<br />без лишней наценки.</p></div>
        <div><p className="footer-label">Связаться</p><a href="https://t.me/jardinmanager" target="_blank" rel="noreferrer">Заказать · @jardinmanager</a><a href="https://t.me/jardinnsecret" target="_blank" rel="noreferrer">Канал · @jardinnsecret</a></div>
        <div><p className="footer-label">Больше</p><a href="https://t.me/jardinotzivi" target="_blank" rel="noreferrer">Отзывы · @jardinotzivi</a><a href="https://t.me/aminakulieva" target="_blank" rel="noreferrer">Сотрудничество</a></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Jardin Secret</span><span>Developed by <a href="https://t.me/verbtwdev" target="_blank" rel="noreferrer">@verbtwdev</a></span></div>
      </footer>
    </div>
  );
}
