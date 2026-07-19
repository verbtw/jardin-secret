import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage } from '../auth/auth-errors';
import { AuthFormShell } from '../components/AuthFormShell';
import { AuthUnavailable } from './RegisterPage';

export function LoginPage() {
  const { signIn, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setPending(true); setStatus('');
    try { await signIn(String(data.get('email') ?? '').trim(), String(data.get('password') ?? '')); navigate((location.state as { from?: string } | null)?.from ?? '/account', { replace: true }); }
    catch (error) { setStatus(authErrorMessage(error)); }
    finally { setPending(false); }
  }
  return <AuthFormShell eyebrow="Личный кабинет" title="С возвращением" lead="Войдите, чтобы использовать сохранённые контакты и видеть свои заказы." footer={<p>Нет аккаунта? <Link to="/register">Создать</Link></p>}><form className="auth-form" onSubmit={submit}><AuthUnavailable configured={configured} /><label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label><label><span>Пароль</span><input name="password" type="password" autoComplete="current-password" required /></label><Link className="auth-small-link" to="/forgot-password">Забыли пароль?</Link><button className="button" type="submit" disabled={pending || !configured}>{pending ? 'Входим…' : 'Войти'}</button><p className="auth-status" aria-live="polite">{status}</p></form></AuthFormShell>;
}
