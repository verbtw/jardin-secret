import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage } from '../auth/auth-errors';
import { AuthFormShell } from '../components/AuthFormShell';
import { AuthUnavailable } from './RegisterPage';

export function ForgotPasswordPage() {
  const { requestPasswordReset, configured } = useAuth(); const [status, setStatus] = useState(''); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); try { await requestPasswordReset(String(new FormData(event.currentTarget).get('email') ?? '').trim()); setStatus('Письмо для восстановления отправлено.'); } catch (error) { setStatus(authErrorMessage(error)); } finally { setPending(false); } }
  return <AuthFormShell eyebrow="Восстановление" title="Вернём доступ" lead="Укажите email — пришлём безопасную ссылку для нового пароля." footer={<p><Link to="/login">Вернуться ко входу</Link></p>}><form className="auth-form" onSubmit={submit}><AuthUnavailable configured={configured} /><label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label><button className="button" type="submit" disabled={pending || !configured}>{pending ? 'Отправляем…' : 'Отправить ссылку'}</button><p className="auth-status" aria-live="polite">{status}</p></form></AuthFormShell>;
}
