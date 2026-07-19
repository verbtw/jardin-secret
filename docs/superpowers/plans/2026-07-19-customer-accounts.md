# Customer Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real email/password accounts, a private customer profile, password recovery, and checkout prefilling without changing the Telegram order flow.

**Architecture:** Supabase Auth owns credentials and sessions; a RLS-protected `profiles` table stores delivery details. A small auth adapter and React provider isolate Supabase from pages so the storefront remains usable when auth is unavailable.

**Tech Stack:** React, TypeScript, React Router, Supabase JS, Vitest, Testing Library, Playwright, Vercel

## Global Constraints

- Catalog, cart, and Telegram checkout remain available to guests.
- No online payment is introduced.
- Never expose a Supabase service-role key to the client.
- Only the authenticated user can read or update their own profile.
- Keep `portfolio-images/` outside Git and Vercel.

---

### Task 1: Supabase schema and client boundary

**Files:**
- Create: `supabase/migrations/202607190001_create_profiles.sql`
- Create: `src/lib/supabase.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `package.json`
- Test: `src/lib/supabase.test.ts`

**Interfaces:**
- Produces: `supabase`, `isAuthConfigured`, and database table `public.profiles`.
- Consumes: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

- [ ] **Step 1: Install the browser client**

Run: `npm install @supabase/supabase-js`

Expected: `package.json` and `package-lock.json` contain `@supabase/supabase-js`.

- [ ] **Step 2: Write the failing configuration test**

```ts
import { describe, expect, it, vi } from 'vitest';

describe('Supabase configuration', () => {
  it('reports auth as unavailable when public variables are absent', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.resetModules();
    const module = await import('./supabase');
    expect(module.isAuthConfigured).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test and confirm RED**

Run: `npm test -- src/lib/supabase.test.ts --run`

Expected: FAIL because `src/lib/supabase.ts` does not exist.

- [ ] **Step 4: Create the migration and client**

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  city text not null default '',
  address text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
for select using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
for insert with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
for update using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
```

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const isAuthConfigured = Boolean(url && anonKey);
export const supabase = isAuthConfigured ? createClient(url, anonKey) : null;
```

Add to `src/vite-env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
```

- [ ] **Step 5: Run the focused test and commit**

Run: `npm test -- src/lib/supabase.test.ts --run`

Expected: PASS.

```bash
git add package.json package-lock.json supabase src/lib src/vite-env.d.ts
git commit -m "feat: configure customer auth backend"
```

### Task 2: Auth service, provider, and Russian errors

**Files:**
- Create: `src/auth/auth-service.ts`
- Create: `src/auth/auth-errors.ts`
- Create: `src/auth/AuthProvider.tsx`
- Test: `src/auth/auth-errors.test.ts`
- Test: `src/auth/AuthProvider.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `AuthState`, `useAuth()`, `signUp`, `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`.
- Consumes: nullable `supabase` client from Task 1.

- [ ] **Step 1: Write failing error mapping tests**

```ts
import { expect, it } from 'vitest';
import { authErrorMessage } from './auth-errors';

it('maps invalid credentials to Russian copy', () => {
  expect(authErrorMessage(new Error('Invalid login credentials'))).toBe('Неверный email или пароль.');
});

it('hides unknown backend details', () => {
  expect(authErrorMessage(new Error('database exploded'))).toBe('Не удалось выполнить запрос. Попробуйте ещё раз.');
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- src/auth/auth-errors.test.ts --run`

Expected: FAIL because `auth-errors.ts` does not exist.

- [ ] **Step 3: Implement error mapping**

```ts
export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials')) return 'Неверный email или пароль.';
  if (message.includes('already registered')) return 'Аккаунт с таким email уже существует.';
  if (message.includes('password')) return 'Пароль должен содержать не менее 8 символов.';
  if (message.includes('rate limit')) return 'Слишком много попыток. Попробуйте немного позже.';
  return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}
```

- [ ] **Step 4: Add the auth service and provider**

Define this public state:

```ts
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
```

The provider must call `supabase.auth.getSession()` once, subscribe with `onAuthStateChange`, unsubscribe on unmount, and throw the Russian unavailable message only when an auth action is requested without configuration.

- [ ] **Step 5: Wrap the application and verify**

Wrap `BrowserRouter` with `AuthProvider` inside `App`.

Run: `npm test -- src/auth --run`

Expected: all auth tests PASS and the subscription cleanup assertion runs once.

```bash
git add src/auth src/App.tsx
git commit -m "feat: add customer session provider"
```

### Task 3: Registration, login, and password recovery pages

**Files:**
- Create: `src/components/AuthFormShell.tsx`
- Create: `src/pages/RegisterPage.tsx`
- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/ForgotPasswordPage.tsx`
- Create: `src/pages/ResetPasswordPage.tsx`
- Test: `src/pages/RegisterPage.test.tsx`
- Test: `src/pages/LoginPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `useAuth()` from Task 2.
- Produces: routes `/register`, `/login`, `/forgot-password`, `/reset-password` and account link in header.

- [ ] **Step 1: Write the failing registration behavior test**

```tsx
it('rejects different passwords before calling signUp', async () => {
  render(<RegisterPage />);
  await userEvent.type(screen.getByLabelText('Email'), 'buyer@example.com');
  await userEvent.type(screen.getByLabelText('Пароль'), 'long-password');
  await userEvent.type(screen.getByLabelText('Повторите пароль'), 'different-password');
  await userEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
  expect(screen.getByText('Пароли не совпадают.')).toBeInTheDocument();
  expect(signUp).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the page test and confirm RED**

Run: `npm test -- src/pages/RegisterPage.test.tsx --run`

Expected: FAIL because `RegisterPage` is missing.

- [ ] **Step 3: Implement the four forms**

All forms use semantic labels, `aria-live="polite"` for status, disabled submit buttons while pending, Russian errors from `authErrorMessage`, and links between related routes. Registration requires a checked consent checkbox and a password of at least 8 characters.

- [ ] **Step 4: Add routes and header control**

Add routes to `App.tsx`. In `Layout`, show `CircleUserRound` with label `Войти` for guests and `Профиль` for authenticated users. The control remains visible next to the cart on desktop and mobile.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/pages/RegisterPage.test.tsx src/pages/LoginPage.test.tsx --run`

Expected: all form tests PASS.

```bash
git add src/components/AuthFormShell.tsx src/pages/*PasswordPage.tsx src/pages/RegisterPage.tsx src/pages/LoginPage.tsx src/App.tsx src/components/Layout.tsx src/styles.css
git commit -m "feat: add customer access screens"
```

### Task 4: Private profile and checkout prefill

**Files:**
- Create: `src/auth/profile-service.ts`
- Create: `src/pages/AccountPage.tsx`
- Create: `src/components/ProtectedRoute.tsx`
- Test: `src/auth/profile-service.test.ts`
- Test: `src/pages/AccountPage.test.tsx`
- Modify: `src/pages/CheckoutPage.tsx`
- Test: `src/pages/CheckoutPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `CustomerProfile`, `loadProfile(userId)`, `saveProfile(profile)`, protected `/account`.
- Consumes: authenticated `user.id` and Supabase `profiles` table.

- [ ] **Step 1: Write the failing profile mapping test**

```ts
it('maps the database row to checkout-compatible fields', () => {
  expect(profileFromRow({ id: 'u1', full_name: 'Алина', phone: '+79990000000', city: 'Казань', address: 'ул. Баумана, 1' })).toEqual({
    id: 'u1', name: 'Алина', phone: '+79990000000', city: 'Казань', address: 'ул. Баумана, 1'
  });
});
```

- [ ] **Step 2: Run the profile test and confirm RED**

Run: `npm test -- src/auth/profile-service.test.ts --run`

Expected: FAIL because `profileFromRow` is missing.

- [ ] **Step 3: Implement profile persistence**

```ts
export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
}
```

`loadProfile` uses `.from('profiles').select(...).eq('id', userId).maybeSingle()`. `saveProfile` uses `upsert` with `id`, `full_name`, `phone`, `city`, `address`, and a new ISO `updated_at`.

- [ ] **Step 4: Implement protected profile and checkout prefill**

`ProtectedRoute` preserves the attempted URL in router state. `AccountPage` loads and saves the four profile fields. `CheckoutPage` copies profile values into initially empty fields once per signed-in user and never overwrites text the customer has already entered.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/auth/profile-service.test.ts src/pages/AccountPage.test.tsx src/pages/CheckoutPage.test.tsx --run`

Expected: all profile and checkout tests PASS.

```bash
git add src/auth/profile-service.ts src/components/ProtectedRoute.tsx src/pages/AccountPage.tsx src/pages/CheckoutPage.tsx src/pages/*.test.tsx src/App.tsx src/styles.css
git commit -m "feat: add customer profile and checkout prefill"
```

### Task 5: Configure environments and verify accounts

**Files:**
- Create: `.env.example`
- Modify: `tests/storefront.spec.ts`
- Modify: `README.md` if present

**Interfaces:**
- Consumes: Supabase project URL and anon key.
- Produces: working local and Vercel auth configuration.

- [ ] **Step 1: Document public variables**

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

- [ ] **Step 2: Apply the migration and configure auth redirects**

Apply `supabase/migrations/202607190001_create_profiles.sql`. Allow local `http://localhost:4173/reset-password` and production `https://jardin-secret-phi.vercel.app/reset-password` redirects.

- [ ] **Step 3: Add browser coverage**

The E2E test opens `/register`, verifies accessible form controls, opens `/login`, and confirms the guest storefront remains functional when the test environment has no Supabase credentials. A live-account smoke test is run separately against the configured deployment.

- [ ] **Step 4: Run the full gate**

Run: `npm test -- --run && npm run build && npm run test:e2e`

Expected: unit/component suite, TypeScript/Vite build, desktop E2E, and mobile E2E all exit 0.

- [ ] **Step 5: Commit**

```bash
git add .env.example tests/storefront.spec.ts README.md
git commit -m "test: verify customer account flow"
```

### Task 6: Block checkout until price and volume are known

**Files:**
- Modify: `src/domain/catalog.ts`
- Test: `src/domain/catalog.test.ts`
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/pages/CartPage.tsx`
- Test: `src/pages/CartPage.test.tsx`
- Modify: `src/pages/CheckoutPage.tsx`

**Interfaces:**
- Produces: `getOrderReadiness(product): { ready: boolean; missing: ('price' | 'volume')[] }`.
- Consumes: `priceRub` and `volumeMl` from each product.

- [ ] **Step 1: Write the failing readiness test**

```ts
it('requires both a price and a volume before checkout', () => {
  expect(getOrderReadiness({ priceRub: null, volumeMl: null } as Product)).toEqual({ ready: false, missing: ['price', 'volume'] });
  expect(getOrderReadiness({ priceRub: 12000, volumeMl: 100 } as Product)).toEqual({ ready: true, missing: [] });
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/domain/catalog.test.ts --run`

Expected: FAIL because `getOrderReadiness` does not exist.

- [ ] **Step 3: Implement the shared rule**

```ts
export function getOrderReadiness(product: Pick<Product, 'priceRub' | 'volumeMl'>) {
  const missing: Array<'price' | 'volume'> = [];
  if (product.priceRub == null) missing.push('price');
  if (product.volumeMl == null) missing.push('volume');
  return { ready: missing.length === 0, missing };
}
```

- [ ] **Step 4: Apply the rule to every order entry point**

Product cards and product pages replace add-to-cart with a Telegram manager link when not ready. Cart lists `Уточните цену`, `Уточните объём`, or both and disables the checkout link. Checkout rejects a direct URL when any current cart product is not ready and offers manager contact plus return-to-cart actions.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/domain/catalog.test.ts src/pages/CartPage.test.tsx src/pages/CheckoutPage.test.tsx --run`

Expected: readiness, cart, and direct-checkout tests PASS.

```bash
git add src/domain/catalog.ts src/domain/catalog.test.ts src/components/ProductCard.tsx src/pages/ProductPage.tsx src/pages/CartPage.tsx src/pages/CartPage.test.tsx src/pages/CheckoutPage.tsx src/pages/CheckoutPage.test.tsx
git commit -m "feat: require confirmed price and volume for checkout"
```
