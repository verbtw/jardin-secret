import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage } from '../auth/auth-errors';
import { AuthFormShell } from '../components/AuthFormShell';

export function RegisterPage() {
  const { signUp, configured } = useAuth();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const repeat = String(data.get('repeat') ?? '');
    if (password.length < 8) { setStatus('Пароль должен содержать не менее 8 символов.'); return; }
    if (password !== repeat) { setStatus('Пароли не совпадают.'); return; }
    if (!data.get('consent')) { setStatus('Подтвердите согласие на обработку данных.'); return; }
    setPending(true); setStatus('');
    try { await signUp(email, password); setStatus('Проверьте почту и подтвердите email, чтобы войти.'); }
    catch (error) { setStatus(authErrorMessage(error)); }
    finally { setPending(false); }
  }
  return <AuthFormShell eyebrow="Новый аккаунт" title="Создайте свой профиль" lead="Сохраняйте контакты для заказа и возвращайтесь к ним с любого устройства." footer={<p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>}><form className="auth-form" onSubmit={submit}><AuthUnavailable configured={configured} /><label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label><label><span>Пароль</span><input name="password" type="password" autoComplete="new-password" required minLength={8} /></label><label><span>Повторите пароль</span><input name="repeat" type="password" autoComplete="new-password" required minLength={8} /></label><label className="auth-consent"><input name="consent" type="checkbox" /><span>Согласен на обработку данных для работы личного кабинета</span></label><button className="button" type="submit" disabled={pending || !configured}>{pending ? 'Создаём…' : 'Создать аккаунт'}</button><p className="auth-status" aria-live="polite">{status}</p></form></AuthFormShell>;
}

export function AuthUnavailable({ configured }: { configured: boolean }) {
  return configured ? null : <p className="auth-notice">Личный кабинет настраивается. Каталог и заказ через Telegram доступны без регистрации.</p>;
}
