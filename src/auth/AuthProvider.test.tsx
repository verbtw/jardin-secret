import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

const unsubscribe = vi.fn();
vi.mock('../lib/supabase', () => ({
  isAuthConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
      signUp: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(),
    },
  },
}));

function Probe() {
  const auth = useAuth();
  return <span>{auth.loading ? 'loading' : auth.user ? 'user' : 'guest'}</span>;
}

it('loads the current session and cleans up the subscription', async () => {
  const view = render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText('guest')).toBeVisible());
  view.unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});
