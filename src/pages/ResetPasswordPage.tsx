import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage } from '../auth/auth-errors';
import { AuthFormShell } from '../components/AuthFormShell';

export function ResetPasswordPage() {
  const { updatePassword, configured } = useAuth(); const [status, setStatus] = useState(''); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const password = String(new FormData(event.currentTarget).get('password') ?? ''); if (password.length < 8) { setStatus('Пароль должен содержать не менее 8 символов.'); return; } setPending(true); try { await updatePassword(password); setStatus('Пароль обновлён. Теперь можно войти.'); } catch (error) { setStatus(authErrorMessage(error)); } finally { setPending(false); } }
  return <AuthFormShell eyebrow="Новый пароль" title="Придумайте новый пароль" lead="Используйте не менее восьми символов и не повторяйте пароль от почты." footer={<p><Link to="/login">Перейти ко входу</Link></p>}><form className="auth-form" onSubmit={submit}><label><span>Новый пароль</span><input name="password" type="password" autoComplete="new-password" minLength={8} required /></label><button className="button" type="submit" disabled={pending || !configured}>{pending ? 'Сохраняем…' : 'Сохранить пароль'}</button><p className="auth-status" aria-live="polite">{status}</p></form></AuthFormShell>;
}
