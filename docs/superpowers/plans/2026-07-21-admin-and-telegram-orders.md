# Admin And Telegram Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the manager a role-protected admin panel and replace checkout with prefilled Telegram order messages available to guests.

**Architecture:** Supabase RLS and an `admin_users` table enforce privileges. Focused React admin pages edit individual fields through a service layer that records overrides and audit events. Public product actions generate a Telegram deep link; authenticated users also receive a saved request.

**Tech Stack:** React, TypeScript, Supabase Auth/Postgres, Vitest, Testing Library, Playwright

## Global Constraints

- Public browsing and Telegram ordering do not require registration.
- No online payment or web checkout.
- Admin access is role-based and server-enforced.
- Manual field overrides survive daily sync until «Вернуть автообновление».
- The Telegram message includes site origin, exact fragrance variant and public URL.

---

### Task 1: Admin authorization and audit schema

**Files:**
- Create: `supabase/migrations/202607210003_create_admin.sql`
- Test: `supabase/tests/admin_rls.sql`

**Interfaces:**
- Produces: `admin_users`, `product_overrides`, `admin_audit_log`, `is_admin()`.

- [ ] **Step 1: Test that normal users cannot read or mutate admin data**
- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Add security-definer `is_admin()` with locked search path and RLS policies**

```sql
create function public.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
```

- [ ] **Step 4: Test admin access and audit insert trigger**

Run: `supabase db reset && supabase test db supabase/tests/admin_rls.sql`
Expected: PASS for admin, permission denied for ordinary user.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202607210003_create_admin.sql supabase/tests/admin_rls.sql
git commit -m "feat: secure admin catalog operations"
```

### Task 2: Admin route guard and shell

**Files:**
- Create: `src/admin/admin-service.ts`
- Create: `src/admin/AdminRoute.tsx`
- Create: `src/admin/AdminLayout.tsx`
- Create: `src/admin/AdminRoute.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `getAdminAccess()`, `<AdminRoute>`, `/admin` route tree.

- [ ] **Step 1: Test loading, denied and allowed states**

```tsx
render(<AdminRoute><div>Панель</div></AdminRoute>);
expect(await screen.findByText("Нет доступа")).toBeInTheDocument();
```

- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement role lookup and protected layout**
- [ ] **Step 4: Run component tests and commit**

Run: `npm test -- --run src/admin/AdminRoute.test.tsx`
Expected: PASS.

```bash
git add src/admin src/App.tsx
git commit -m "feat: add role-protected admin shell"
```

### Task 3: Product management and review queue

**Files:**
- Create: `src/admin/AdminProductsPage.tsx`
- Create: `src/admin/AdminProductPage.tsx`
- Create: `src/admin/AdminReviewQueue.tsx`
- Create: `src/admin/admin-products.test.tsx`
- Create: `src/admin.css`

**Interfaces:**
- Produces: search/filter listing, field editor, visibility controls, override/auto actions.

- [ ] **Step 1: Test filters, manual override and restore-auto action**

```tsx
await user.type(screen.getByLabelText("Цена"), "27900");
await user.click(screen.getByRole("button", {name:"Сохранить"}));
expect(saveOverride).toHaveBeenCalledWith(productId,"retail_price_rub",27900);
```

- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement compact desktop/mobile admin UI**
- [ ] **Step 4: Show cost, competitors, profit and calculation reason without adding them to public APIs**
- [ ] **Step 5: Verify tests and build**

Run: `npm test -- --run src/admin/admin-products.test.tsx && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin src/admin.css
git commit -m "feat: manage products and overrides in admin"
```

### Task 4: Orders and review moderation

**Files:**
- Create: `src/admin/AdminOrdersPage.tsx`
- Create: `src/admin/AdminReviewsPage.tsx`
- Modify: `src/orders/order-service.ts`
- Modify: `src/reviews/review-service.ts`
- Test: `src/admin/admin-orders-reviews.test.tsx`

**Interfaces:**
- Produces: admin status changes for requests and review publish/reject actions.

- [ ] **Step 1: Test completed order and published review actions**
- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement service methods and pages using RLS-protected tables**
- [ ] **Step 4: Run tests and commit**

Run: `npm test -- --run src/admin/admin-orders-reviews.test.tsx`
Expected: PASS.

```bash
git add src/admin src/orders src/reviews
git commit -m "feat: manage requests and reviews in admin"
```

### Task 5: Prefilled Telegram ordering

**Files:**
- Create: `src/domain/telegram-order.ts`
- Create: `src/domain/telegram-order.test.ts`
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/App.tsx`
- Remove: cart and checkout links from `src/components/Layout.tsx`

**Interfaces:**
- Produces: `buildManagerUrl(product, locationOrigin): string`.

- [ ] **Step 1: Write exact URL encoding test**

```ts
expect(decodeURIComponent(buildManagerUrl(product,"https://jardin.example"))).toContain(
  "Здравствуйте! Я с сайта Jardin Secret и хочу заказать Tom Ford Oud Wood, EDP, 50 мл."
);
```

- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement `https://t.me/jardinmanager?text=` link builder**

```ts
export function buildManagerUrl(product: Product, origin: string) {
  const variant=[product.concentration, `${product.volumeMl} мл`].filter(Boolean).join(", ");
  const text=`Здравствуйте! Я с сайта Jardin Secret и хочу заказать ${product.brand} ${product.name}, ${variant}. Подскажите, пожалуйста, актуальную цену и наличие. ${origin}/product/${product.slug}`;
  return `https://t.me/jardinmanager?text=${encodeURIComponent(text)}`;
}
```

- [ ] **Step 4: Replace cart/checkout actions and keep guest access**
- [ ] **Step 5: Run unit/component tests and build**

Run: `npm test -- --run src/domain/telegram-order.test.ts src/pages/ProductPage.test.tsx && npm run build`
Expected: PASS; no public route requires login.

- [ ] **Step 6: Commit**

```bash
git add src/domain src/components src/pages src/App.tsx
git commit -m "feat: send prefilled product requests to Telegram"
```

