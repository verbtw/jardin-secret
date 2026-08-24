# MAKEUP-Inspired Photo Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the decorative homepage image with a rotating real-perfume showcase and make the catalog a clean white packshot storefront.

**Architecture:** A focused `HeroPerfumeCarousel` owns the curated slide data, timer, controls, and accessible status. `Hero` composes it without knowing timer details. Existing global and product-image CSS are reshaped around a white retail surface while keeping Jardin Secret typography and dark brand sections.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS, Playwright, Vite.

## Global Constraints

- Carousel interval is exactly 7,000 ms.
- Slides use real local packshots and link to existing product routes.
- All packshots remain contained on `#FFFFFF`, with normal colour and no artificial shadow.
- Product and brand names remain title-cased.
- Reduced-motion users do not receive automatic carousel rotation.

---

### Task 1: Real-perfume hero carousel

**Files:**
- Create: `src/components/HeroPerfumeCarousel.tsx`
- Create: `src/components/HeroPerfumeCarousel.test.tsx`
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/Hero.test.tsx`
- Modify: `src/hero-art.css`

**Interfaces:**
- Produces: `HeroPerfumeCarousel(): JSX.Element`.
- Consumes: React state/effect, `Link`, and local `/products/packshots/*` assets.

- [ ] **Step 1: Write failing carousel tests**

Render the component with fake timers. Assert the first slide is `Amouage Guidance`, advancing 7,000 ms shows `Tom Ford Black Lacquer`, clicking a named dot selects its slide, and reduced motion prevents timer registration.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest --run --root . --exclude '**/node_modules/**' --exclude '**/dist/**' --exclude '**/tests/**' src/components/HeroPerfumeCarousel.test.tsx`

Expected: FAIL because `HeroPerfumeCarousel` does not exist.

- [ ] **Step 3: Implement the carousel and compose it into Hero**

Create five curated slides with `brand`, `name`, `slug`, and local `imageUrl`. Render one linked `<img>` at a time, an `aria-live="polite"` label, and named dot buttons. Advance using `window.setInterval(..., 7000)` and skip it when `matchMedia('(prefers-reduced-motion: reduce)').matches`.

- [ ] **Step 4: Replace the decorative arch styling**

Make `.hero__media` a clean white rectangular retail stage with restrained border, contained image, product caption, and dots. Keep responsive rules for 980 px and 600 px.

- [ ] **Step 5: Run carousel and Hero tests and verify GREEN**

Run the focused Vitest command for both component test files. Expected: all tests pass.

### Task 2: White catalog retail surface

**Files:**
- Modify: `src/product-images.css`
- Modify: `src/components/ProductImage.test.tsx`
- Create: `src/storefront-photo-surface.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: existing `.catalog-page`, `.product-card`, `.page-heading`, `.product-image` markup.
- Produces: shared white surface rules without changing product data.

- [ ] **Step 1: Write failing style-contract tests**

Assert the photo stylesheet keeps `background: #fff`, `object-fit: contain`, `mix-blend-mode: normal`, and tighter card padding. Assert the new surface stylesheet makes the catalog, page heading, and cards white and removes decorative gradients from the catalog surface.

- [ ] **Step 2: Run the focused test and verify RED**

Run the ProductImage test file. Expected: FAIL for missing retail-surface stylesheet contract.

- [ ] **Step 3: Implement the white catalog surface**

Import `storefront-photo-surface.css` after existing styles. Use white/porcelain colors, fine neutral borders, quieter card hover, slightly taller photo wells, and preserve two columns on mobile.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run ProductImage and ProductCard tests. Expected: all tests pass.

### Task 3: Full verification and publication

**Files:**
- Modify if necessary: `tests/storefront.spec.ts`

**Interfaces:**
- Validates the full storefront at desktop and mobile sizes.

- [ ] **Step 1: Run all unit and integration tests**

Run Vitest with explicit worktree-safe excludes. Expected: zero failures.

- [ ] **Step 2: Run production build and E2E tests**

Run: `npm run build && npm run test:e2e && git diff --check`. Expected: zero failures.

- [ ] **Step 3: Visually inspect desktop and mobile screenshots**

Check homepage hero and catalog at 1440×1000 and 390×844. Verify real bottles, white surfaces, title casing, controls, no overflow, and no browser console errors.

- [ ] **Step 4: Commit, push, merge, deploy, and verify production**

Create a PR, wait for checks, squash merge, deploy production through the linked Vercel project, and verify `https://jardin-secret-phi.vercel.app` with Playwright.
