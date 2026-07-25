# Unified Product Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every current and future fragrance image the same uncropped Jardin Secret studio presentation in cards, details, and compact cart rows.

**Architecture:** Add one presentational `ProductImage` component that owns loading, fallback, accessibility, and variant classes. Replace every raw storefront product `<img>` with that component, then define the shared studio surface and per-context sizing in the existing stylesheet.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, CSS, Vite, Playwright

## Global Constraints

- The component must accept every `imageUrl`, including local products, Supabase rows, and future daily imports.
- Images must use `object-fit: contain`, remain centered, and never crop the bottle or box.
- The surface must be milk-white with a subtle cool-green glow and soft oval shadow.
- Lists use lazy loading; the detail view loads eagerly; all failures use `/products/placeholder.svg`.
- The same component must cover catalog/home cards, product detail, and compact cart rows on desktop and mobile.

---

### Task 1: Reusable Product Image Contract

**Files:**
- Create: `src/components/ProductImage.tsx`
- Create: `src/components/ProductImage.test.tsx`

**Interfaces:**
- Consumes: `src`, `alt`, `variant`, and optional `className` from storefront product views.
- Produces: `ProductImage({src, alt, variant, className})`, where `variant` is `'card' | 'detail' | 'compact'`.

- [ ] **Step 1: Write the failing component test**

```tsx
render(<ProductImage src="/bottle.jpg" alt="Maison Test Scent" variant="card" />);
expect(screen.getByTestId('product-image')).toHaveClass('product-image--card');
expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
fireEvent.error(screen.getByRole('img'));
expect(screen.getByRole('img')).toHaveAttribute('src', '/products/placeholder.svg');
```

- [ ] **Step 2: Run the test and verify the feature is absent**

Run: `npm test -- --run src/components/ProductImage.test.tsx`

Expected: FAIL because `ProductImage` does not exist.

- [ ] **Step 3: Implement the component**

```tsx
type ProductImageProps = {
  src: string;
  alt: string;
  variant: 'card' | 'detail' | 'compact';
  className?: string;
};

export function ProductImage({src, alt, variant, className = ''}: ProductImageProps) {
  const loading = variant === 'detail' ? 'eager' : 'lazy';
  return (
    <div className={`product-image product-image--${variant} ${className}`.trim()} data-testid="product-image">
      <span className="product-image__shadow" aria-hidden="true" />
      <img className="product-image__media" src={src} alt={alt} loading={loading}
        onError={(event) => { if (!event.currentTarget.src.endsWith('/products/placeholder.svg')) event.currentTarget.src = '/products/placeholder.svg'; }} />
    </div>
  );
}
```

- [ ] **Step 4: Run the component test**

Run: `npm test -- --run src/components/ProductImage.test.tsx`

Expected: PASS for card, detail loading, fallback, and custom classes.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductImage.tsx src/components/ProductImage.test.tsx
git commit -m "feat: add unified product image component"
```

### Task 2: Use the Component for Every Fragrance

**Files:**
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/components/ProductCard.test.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/pages/ProductPage.test.tsx`
- Modify: `src/pages/CartPage.tsx`

**Interfaces:**
- Consumes: `ProductImage` from Task 1.
- Produces: no raw product `<img>` in storefront components; every catalog source receives the shared visual wrapper.

- [ ] **Step 1: Write failing integration assertions**

```tsx
expect(screen.getByTestId('product-image')).toHaveClass('product-image--card');
expect(screen.getByRole('img', {name: 'Tom Ford Oud Wood'})).toHaveAttribute('src', product.imageUrl);
```

Add the corresponding `product-image--detail` assertion to `ProductPage.test.tsx`.

- [ ] **Step 2: Run the focused tests**

Run: `npm test -- --run src/components/ProductCard.test.tsx src/pages/ProductPage.test.tsx`

Expected: FAIL because the pages still render raw image tags.

- [ ] **Step 3: Replace raw product image tags**

```tsx
<ProductImage src={product.imageUrl} alt={`${product.brand} ${product.name}`} variant="card" />
<ProductImage src={product.imageUrl} alt={`${product.brand} ${product.name}`} variant="detail" className="product-detail__image" />
<ProductImage src={product.imageUrl} alt="" variant="compact" />
```

Keep the card component nested inside its product link and use the compact form in `CartPage`.

- [ ] **Step 4: Verify integration and total coverage**

Run: `npm test -- --run src/components/ProductCard.test.tsx src/pages/ProductPage.test.tsx`

Expected: PASS.

Run: `rg -n '<img' src/components src/pages`

Expected: the only storefront product image tag is inside `src/components/ProductImage.tsx`; unrelated decorative images may remain.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductCard.tsx src/components/ProductCard.test.tsx src/pages/ProductPage.tsx src/pages/ProductPage.test.tsx src/pages/CartPage.tsx
git commit -m "refactor: use unified images across storefront"
```

### Task 3: Studio Styling and Responsive Verification

**Files:**
- Modify: `src/styles.css`
- Test: `src/components/ProductImage.test.tsx`
- Test: `tests/storefront.spec.ts` or the existing equivalent Playwright storefront spec

**Interfaces:**
- Consumes: `.product-image`, `.product-image__media`, `.product-image__shadow`, and variant classes from Tasks 1–2.
- Produces: stable responsive frames with consistent containment and studio styling.

- [ ] **Step 1: Add a failing stylesheet contract test**

```tsx
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
expect(css).toMatch(/\.product-image__media[^}]*object-fit:\s*contain/);
expect(css).toMatch(/\.product-image--detail/);
expect(css).toMatch(/\.product-image--compact/);
```

- [ ] **Step 2: Run the contract test**

Run: `npm test -- --run src/components/ProductImage.test.tsx`

Expected: FAIL because the studio CSS does not exist.

- [ ] **Step 3: Add the shared studio CSS and variant sizing**

```css
.product-image{position:relative;display:grid;place-items:center;isolation:isolate;overflow:hidden;background:radial-gradient(ellipse at 50% 88%,rgba(79,112,83,.13),transparent 33%),linear-gradient(145deg,#fff 0%,#f8faf8 60%,#edf3ee 100%)}
.product-image__shadow{position:absolute;z-index:0;left:24%;right:24%;bottom:9%;height:7%;border-radius:50%;background:rgba(35,52,38,.2);filter:blur(10px)}
.product-image__media{position:relative;z-index:1;width:100%;height:100%;object-fit:contain;filter:saturate(.94) contrast(1.02);mix-blend-mode:multiply}
.product-image--card{height:290px;padding:24px 24px 20px}
.product-image--detail{min-height:620px;padding:clamp(42px,7vw,84px)}
.product-image--compact{width:90px;height:105px;padding:8px;border-radius:10px}
```

Update existing hover and breakpoints to target these classes and preserve 215px mobile cards, 480/390px detail frames, and 70x85px compact rows.

- [ ] **Step 4: Run all verification**

Run: `npm test -- --run`

Expected: all Vitest suites PASS.

Run: `npm run build`

Expected: TypeScript and Vite production build complete without errors.

Run: `npm run test:e2e`

Expected: Playwright storefront tests PASS at desktop and mobile sizes.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/components/ProductImage.test.tsx tests
git commit -m "style: unify every fragrance image"
```

### Task 4: Publish and Production Check

**Files:**
- No source files unless production verification exposes a defect.

**Interfaces:**
- Consumes: verified production build from Task 3.
- Produces: GitHub branch/PR and a public Vercel production deployment.

- [ ] **Step 1: Push the branch and open a pull request**

Run: `git push -u origin codex/unified-product-images`

Expected: branch is visible in `verbtw/jardin-secret`.

- [ ] **Step 2: Merge after CI succeeds**

Run: `gh pr checks --watch` and `gh pr merge --squash --delete-branch`

Expected: the pull request is merged into `main`.

- [ ] **Step 3: Deploy production**

Run: `vercel --prod --yes`

Expected: deployment aliases to `https://jardin-secret-phi.vercel.app`.

- [ ] **Step 4: Verify production visually and functionally**

Open catalog and several product pages using both local and Supabase-backed image URLs at desktop and mobile widths. Confirm every product uses the milk-white studio frame, no bottle is cropped, fallback works, and the manager link still carries the selected fragrance.
