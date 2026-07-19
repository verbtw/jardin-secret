import { describe, expect, it, vi } from 'vitest';

describe('Supabase configuration', () => {
  it('reports auth as unavailable when public variables are absent', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.resetModules();
    const module = await import('./supabase');
    expect(module.isAuthConfigured).toBe(false);
    expect(module.supabase).toBeNull();
  });
});
