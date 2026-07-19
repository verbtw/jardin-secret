import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
export function ProtectedRoute({ children }: { children: ReactNode }) { const { user, loading } = useAuth(); const location = useLocation(); if (loading) return <main className="empty-page"><p className="eyebrow">Личный кабинет</p><h1>Загружаем профиль…</h1></main>; if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />; return children; }
