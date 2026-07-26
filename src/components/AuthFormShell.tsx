import type { ReactNode } from 'react';
import {BrandLogo} from './BrandLogo';

export function AuthFormShell({ eyebrow, title, lead, children, footer }: { eyebrow: string; title: string; lead: string; children: ReactNode; footer: ReactNode }) {
  return <main className="auth-page"><section className="auth-intro"><BrandLogo light /><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{lead}</p></div><small>Личный сад · только ваши данные</small></section><section className="auth-panel"><div className="auth-panel__inner">{children}<div className="auth-footer">{footer}</div></div></section></main>;
}
