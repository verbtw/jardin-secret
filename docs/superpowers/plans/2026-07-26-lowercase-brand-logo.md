# Lowercase Brand Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-built wordmark with the approved reusable SVG signature and render all customer-facing product brands and fragrance names in lowercase without modifying catalog data.

**Architecture:** A focused `BrandLogo` component owns the single local SVG asset and replaces repeated wordmark markup. Lowercasing remains a presentation concern implemented with explicit semantic classes and CSS `text-transform`, preserving canonical data for search, accessibility, URLs, and Telegram orders.

**Tech Stack:** React 19, React Router, TypeScript, CSS, Vitest, Testing Library, Vite.

## Global Constraints

- Use one local transparent SVG in header, footer, and authentication pages.
- Display product brands and fragrance names in lowercase only in visible storefront typography.
- Do not mutate catalog records, URLs, search values, Telegram copy, `alt`, or `aria-label` text.
- Do not edit packaging text inside product photography.
- Preserve responsive layouts at 390px and 1440px.

---

### Task 1: Reusable approved wordmark

**Files:**
- Create: `public/brand/jardin-secret-wordmark.svg`
- Create: `src/components/BrandLogo.tsx`
- Create: `src/components/BrandLogo.test.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/components/AuthFormShell.tsx`
- Modify: `src/styles.css`
- Modify: `src/auth.css`

**Interfaces:**
- Produces: `BrandLogo({light?: boolean}: {light?: boolean})`, a router link to `/` with accessible name `Jardin Secret — главная`.
- Consumes: `/brand/jardin-secret-wordmark.svg` through a CSS mask so one asset can inherit pine or light footer color.

- [ ] **Step 1: Write the failing component tests**

```tsx
it('renders the approved local wordmark asset', () => {
  render(<MemoryRouter><BrandLogo /></MemoryRouter>);
  expect(screen.getByRole('link', {name: 'Jardin Secret — главная'})).toContainElement(
    screen.getByTestId('brand-logo-art'),
  );
  expect(screen.getByTestId('brand-logo-art')).toHaveClass('brand-logo__art');
});

it('uses the same asset treatment for the light version', () => {
  render(<MemoryRouter><BrandLogo light /></MemoryRouter>);
  expect(screen.getByRole('link', {name: 'Jardin Secret — главная'})).toHaveClass('brand-logo--light');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/components/BrandLogo.test.tsx`

Expected: FAIL because `BrandLogo.tsx` does not exist.

- [ ] **Step 3: Add the vector asset and component**

```tsx
import {Link} from 'react-router-dom';

export function BrandLogo({light = false}: {light?: boolean}) {
  return <Link className={`brand-logo${light ? ' brand-logo--light' : ''}`} to="/" aria-label="Jardin Secret — главная"><span className="brand-logo__art" data-testid="brand-logo-art" aria-hidden="true" /></Link>;
}
```

Create a `viewBox="0 0 190 82"` SVG showing `jardin` above an indented `secret` in the approved italic display style. Add `.brand-logo__art` with `mask: url('/brand/jardin-secret-wordmark.svg') center / contain no-repeat`, a fixed aspect ratio, and `background: currentColor`.

- [ ] **Step 4: Replace duplicated markup**

Use `<BrandLogo />` in the header and authentication shell, and `<BrandLogo light />` in the footer. Remove the old `.wordmark`, `.wordmark span:last-child`, `.wordmark--light`, mobile wordmark, and auth wordmark rules.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- --run src/components/BrandLogo.test.tsx src/components/Layout.test.tsx`

Expected: both files pass.

- [ ] **Step 6: Commit**

```bash
git add public/brand/jardin-secret-wordmark.svg src/components/BrandLogo.tsx src/components/BrandLogo.test.tsx src/components/Layout.tsx src/components/AuthFormShell.tsx src/styles.css src/auth.css
git commit -m "feat: add approved jardin secret wordmark"
```

### Task 2: Lowercase storefront product typography

**Files:**
- Modify: `src/components/ProductCard.test.tsx`
- Modify: `src/pages/ProductPage.test.tsx`
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/pages/CartPage.tsx`
- Modify: `src/components/CatalogControls.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: canonical `Product.brand` and `Product.name` strings unchanged.
- Produces: visible elements with `product-brand-text` and `product-name-text` classes; `.catalog-brand-select` lowercases only option rendering.

- [ ] **Step 1: Write failing presentation tests**

```tsx
it('marks the visible brand and fragrance name for lowercase presentation', () => {
  render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
  expect(screen.getByText('Tom Ford')).toHaveClass('product-brand-text');
  expect(screen.getByText('Oud Wood')).toHaveClass('product-name-text');
  expect(storefrontCss).toMatch(/\.product-brand-text[^}]*text-transform:\s*lowercase/);
  expect(storefrontCss).toMatch(/\.product-name-text[^}]*text-transform:\s*lowercase/);
});
```

Extend the product page test to assert its visible brand and heading receive the same classes while the Telegram URL still contains the canonical `product.brand product.name` string.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/components/ProductCard.test.tsx src/pages/ProductPage.test.tsx`

Expected: FAIL because the presentation classes and CSS rules are absent.

- [ ] **Step 3: Add semantic presentation classes**

Add `product-brand-text` to visible brand elements and `product-name-text` to visible fragrance-name elements in `ProductCard`, `ProductPage`, and `CartPage`. Add `catalog-brand-select` to the brand filter. Keep all interpolation in links, image alternatives, accessible labels, and manager URLs unchanged.

- [ ] **Step 4: Replace the sticker-like typography**

```css
.product-brand-text,
.product-name-text,
.catalog-brand-select { text-transform: lowercase; }

.product-card__brand {
  font: 500 11px/1.2 'Manrope', sans-serif;
  letter-spacing: 0;
  color: var(--leaf);
  margin: 0 0 8px;
}
```

Remove the previous uppercase transform, mono font, and expanded tracking from `.product-card__brand`. Ensure product-detail and cart selectors do not override the shared lowercase transform.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- --run src/components/ProductCard.test.tsx src/pages/ProductPage.test.tsx src/pages/CartPage.test.tsx src/pages/CatalogPage.test.tsx`

Expected: all focused tests pass and Telegram expectations retain canonical capitalization.

- [ ] **Step 6: Run full verification**

Run: `npm test -- --run && npm run build && npm run test:e2e`

Expected: all unit tests, production build, and desktop/mobile storefront scenarios pass.

- [ ] **Step 7: Browser QA and commit**

At 1440px and 390px, verify header, catalog, product detail, auth, and footer; confirm no horizontal overflow and no console errors.

```bash
git add src/components/ProductCard.test.tsx src/pages/ProductPage.test.tsx src/components/ProductCard.tsx src/pages/ProductPage.tsx src/pages/CartPage.tsx src/components/CatalogControls.tsx src/styles.css
git commit -m "feat: lowercase storefront product names"
```
