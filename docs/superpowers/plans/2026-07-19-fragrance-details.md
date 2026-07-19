# Fragrance Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every one of the 114 catalog products an original description, fragrance family, verified notes, accords, and source attribution.

**Architecture:** Telegram product data remains the commercial source of price and availability. A separate editorial JSON file, keyed by stable product ID, is validated and merged at read time so Telegram reimports cannot erase researched details.

**Tech Stack:** TypeScript, JSON, React, Vitest, Testing Library, Playwright

## Global Constraints

- Every catalog item must have an editorial description, fragrance family, at least one note, and a source URL.
- Prefer official brand sources; use a reputable fragrance catalog only when the official page is unavailable.
- Do not copy source prose or invent unverified facts.
- Preserve Telegram descriptions and source links as store-offer data.
- Missing optional year, perfumer, or pyramid level is omitted from the interface.

---

### Task 1: Define and validate editorial data

**Files:**
- Modify: `src/types/product.ts`
- Create: `src/data/fragrance-details.ts`
- Create: `src/data/fragrance-details.json`
- Test: `src/data/fragrance-details.test.ts`

**Interfaces:**
- Produces: `FragranceDetails`, `FragranceDetailsStatus`, `getFragranceDetails(productId)`.
- Consumes: stable product IDs from `products.json`.

- [ ] **Step 1: Write the failing completeness test**

```ts
import products from './products.json';
import details from './fragrance-details.json';

it('has usable details for every product', () => {
  expect(Object.keys(details)).toHaveLength(products.length);
  for (const product of products) {
    const item = details[product.id];
    expect(item.editorialDescription.trim().length).toBeGreaterThan(80);
    expect(item.fragranceFamily.trim()).not.toBe('');
    expect([...item.topNotes, ...item.heartNotes, ...item.baseNotes, ...item.keyNotes].length).toBeGreaterThan(0);
    expect(new URL(item.detailsSourceUrl).protocol).toBe('https:');
  }
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- src/data/fragrance-details.test.ts --run`

Expected: FAIL because the editorial data file does not exist.

- [ ] **Step 3: Define the exact model**

```ts
export type FragranceDetailsStatus = 'verified' | 'partial';

export interface FragranceDetails {
  editorialDescription: string;
  fragranceFamily: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  keyNotes: string[];
  keyAccords: string[];
  perfumers: string[];
  launchYear: number | null;
  detailsSourceUrl: string;
  detailsStatus: FragranceDetailsStatus;
}
```

`getFragranceDetails` returns the keyed record or throws `Missing fragrance details for <productId>` during development.

- [ ] **Step 4: Add a schema guard**

The test must additionally reject detail IDs not present in `products.json`, duplicate note names within one level, non-HTTP sources, launch years outside 1900 through the current year, and records marked `verified` with no structured pyramid.

- [ ] **Step 5: Commit the boundary**

```bash
git add src/types/product.ts src/data/fragrance-details.ts src/data/fragrance-details.test.ts src/data/fragrance-details.json
git commit -m "feat: define fragrance editorial data"
```

### Task 2: Research and populate all 114 records

**Files:**
- Modify: `src/data/fragrance-details.json`
- Create: `docs/fragrance-sources.md`
- Test: `src/data/fragrance-details.test.ts`

**Interfaces:**
- Produces: one validated `FragranceDetails` record for every `Product.id`.
- Consumes: official brand pages and fallback reputable catalog pages.

- [ ] **Step 1: Export the research checklist**

Run a TypeScript one-liner that prints `id`, `brand`, and `name` for all products, then record each researched URL in `docs/fragrance-sources.md` with the corresponding product ID.

- [ ] **Step 2: Populate official-source records**

For every product with a working official brand page, write original Russian description text, family, disclosed notes, accords supported by those notes, perfumer and year only when the source states them, `detailsStatus: "verified"`, and the exact official URL.

- [ ] **Step 3: Populate fallback-source records**

For products without a working official page, use a reputable fragrance catalog, set its exact URL, and choose `verified` only if it provides a structured pyramid; otherwise use `partial` with `keyNotes` and empty pyramid arrays.

- [ ] **Step 4: Run the completeness and integrity gate**

Run: `npm test -- src/data/fragrance-details.test.ts --run`

Expected: PASS with exactly 114 keyed records, no missing required field, no orphan ID, and no invalid URL.

- [ ] **Step 5: Commit the researched dataset**

```bash
git add src/data/fragrance-details.json docs/fragrance-sources.md src/data/fragrance-details.test.ts
git commit -m "content: add verified details for every fragrance"
```

### Task 3: Merge editorial and Telegram data safely

**Files:**
- Modify: `src/types/product.ts`
- Modify: `src/data/catalog.ts`
- Test: `src/data/catalog.test.ts`
- Modify: `scripts/import-telegram.ts`

**Interfaces:**
- Produces: enriched `getProducts(): Product[]` with `details` on every product.
- Consumes: raw `products.json` and keyed `fragrance-details.json`.

- [ ] **Step 1: Write the failing merge test**

```ts
it('attaches editorial details without replacing Telegram offer text', () => {
  const [product] = getProducts();
  expect(product.description).toContain('₽');
  expect(product.details.editorialDescription.length).toBeGreaterThan(80);
  expect(product.details.detailsSourceUrl).not.toBe(product.sourceUrl);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- src/data/catalog.test.ts --run`

Expected: FAIL because products do not have `details`.

- [ ] **Step 3: Implement the merge**

```ts
export function getProducts(): Product[] {
  return rawProducts.map((product) => ({
    ...product,
    details: getFragranceDetails(product.id),
  })) as Product[];
}
```

Extend `Product` with `details: FragranceDetails`; keep raw-import typing separate as `CatalogProductRecord = Omit<Product, 'details'>` so the importer never writes editorial fields.

- [ ] **Step 4: Verify importer isolation**

Update importer types to emit `CatalogProductRecord[]`. Its only output remains `products.json`; it must not open or write `fragrance-details.json`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/data/catalog.test.ts scripts/lib/telegram-parser.test.ts --run`

Expected: merge and parser tests PASS.

```bash
git add src/types/product.ts src/data/catalog.ts src/data/catalog.test.ts scripts/import-telegram.ts
git commit -m "feat: merge fragrance details into catalog"
```

### Task 4: Design the enriched product page

**Files:**
- Create: `src/components/FragranceNotes.tsx`
- Test: `src/components/FragranceNotes.test.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Test: `src/pages/ProductPage.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `FragranceNotes({ details }: { details: FragranceDetails })`.
- Consumes: `product.details` from Task 3.

- [ ] **Step 1: Write failing full and partial display tests**

```tsx
it('renders a verified pyramid by level', () => {
  render(<FragranceNotes details={{ ...verified, topNotes: ['Бергамот'], heartNotes: ['Роза'], baseNotes: ['Амбра'] }} />);
  expect(screen.getByText('Верхние ноты')).toBeInTheDocument();
  expect(screen.getByText('Сердце')).toBeInTheDocument();
  expect(screen.getByText('База')).toBeInTheDocument();
});

it('renders one key-notes group for partial data', () => {
  render(<FragranceNotes details={{ ...partial, keyNotes: ['Ваниль', 'Мускус'] }} />);
  expect(screen.getByText('Ключевые ноты')).toBeInTheDocument();
  expect(screen.queryByText('Верхние ноты')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the component test and confirm RED**

Run: `npm test -- src/components/FragranceNotes.test.tsx --run`

Expected: FAIL because `FragranceNotes` does not exist.

- [ ] **Step 3: Implement the notes component**

Render semantic sections only for non-empty levels, notes as readable chips, and a partial-data badge only when `detailsStatus === 'partial'`.

- [ ] **Step 4: Update the product page**

Keep price and order controls first. Replace the Telegram post body as the main description with `editorialDescription`; add facts for family, accords, optional year and perfumer; add a distinct `Источник характеристик` link while retaining `Открыть исходную публикацию`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/components/FragranceNotes.test.tsx src/pages/ProductPage.test.tsx --run`

Expected: full and partial layouts PASS.

```bash
git add src/components/FragranceNotes.tsx src/components/FragranceNotes.test.tsx src/pages/ProductPage.tsx src/pages/ProductPage.test.tsx src/styles.css
git commit -m "feat: show descriptions and notes on product pages"
```

### Task 5: Full validation and deployment

**Files:**
- Modify: `tests/storefront.spec.ts`

**Interfaces:**
- Consumes: enriched catalog and product page.
- Produces: desktop/mobile regression coverage and deployed site.

- [ ] **Step 1: Add the browser assertion**

Open a product from the catalog and assert its editorial description, fragrance family, at least one visible note, Telegram source link, and detail source link. Repeat under the 390px viewport project.

- [ ] **Step 2: Run the full local gate**

Run: `npm test -- --run && npm run build && npm run test:e2e`

Expected: all unit/component tests, Vite build, and two Playwright projects exit 0.

- [ ] **Step 3: Deploy to Vercel**

Run: `vercel deploy --prod --yes`

Expected: deployment target is production and status becomes `READY`.

- [ ] **Step 4: Smoke-test production**

Check `/`, `/catalog`, one direct `/product/<slug>` URL, one `/products/<id>.jpg`, `/login`, and `/account`. Confirm HTTP 200 where public, correct login redirect for `/account`, at least 114 catalog cards, and no browser console errors.

- [ ] **Step 5: Commit and publish**

```bash
git add tests/storefront.spec.ts
git commit -m "test: verify enriched fragrance pages"
git push -u origin main
```
