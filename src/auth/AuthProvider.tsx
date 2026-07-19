import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isAuthConfigured, supabase } from '../lib/supabase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function client() {
  if (!supabase) throw new Error('Supabase auth is not configured');
  return supabase;
}

function throwIfError(error: Error | null) {
  if (error) throw error;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isAuthConfigured);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) { setUser(data.session?.user ?? null); setLoading(false); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ?? null); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    configured: isAuthConfigured,
    async signUp(email, password) {
      const { error } = await client().auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/account` } });
      throwIfError(error);
    },
    async signIn(email, password) {
      const { error } = await client().auth.signInWithPassword({ email, password });
      throwIfError(error);
    },
    async signOut() { const { error } = await client().auth.signOut(); throwIfError(error); },
    async requestPasswordReset(email) {
      const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      throwIfError(error);
    },
    async updatePassword(password) { const { error } = await client().auth.updateUser({ password }); throwIfError(error); },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
