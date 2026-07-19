# Jardin Secret Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive perfume storefront that imports Jardin Secret products from Telegram, supports catalog discovery and a persistent cart, and hands a validated order to the Telegram manager without online payment.

**Architecture:** A Vite + React + TypeScript single-page application reads a generated `products.json` snapshot and stores only cart state in `localStorage`. A separate Node script downloads public Telegram channel pages, parses product posts, deduplicates them, and writes the snapshot plus local image assets. Pure domain functions handle filtering, cart math, validation, and order text so they can be tested independently from the UI.

**Tech Stack:** React 19, TypeScript 5, Vite 7, React Router, Vitest, Testing Library, Playwright, Cheerio, Lucide React, CSS Modules/global design tokens.

## Global Constraints

- Visual direction is “Стеклянный сад” using `#213D2E`, `#527863`, `#CADCCE`, `#F4E9F1`, `#F8FAF7`, and `#162B20`.
- The catalog is a one-time snapshot of public posts from `https://t.me/jardinnsecret`; no Telegram API credentials or backend are introduced.
- Unknown price, volume, category, or availability is displayed as “Уточнить у менеджера”; source data is never invented.
- Checkout has no payment and no server persistence.
- Order handoff copies the summary, opens `https://t.me/jardinmanager`, and preserves a manually selectable fallback.
- Contacts are `@jardinnsecret`, `@jardinmanager`, `@jardinotzivi`, and `@aminakulieva`; delivery is described as Russia and CIS.
- The footer includes the exact visible text “Сайт сделал verbtw”.
- Keyboard focus is visible, reduced motion is respected, and the layout supports viewports from 360px.

## File Map

```text
package.json                     dependencies and commands
vite.config.ts                   Vite and Vitest configuration
playwright.config.ts             browser test configuration
index.html                       document shell and metadata
scripts/import-telegram.ts       public-channel crawler and snapshot writer
scripts/lib/telegram-parser.ts   HTML-to-product parsing and deduplication
scripts/fixtures/channel.html    deterministic parser test fixture
src/main.tsx                     React bootstrap
src/App.tsx                      routes and shared application shell
src/styles.css                   tokens, typography, responsive rules, focus and motion
src/types/product.ts             Product and Telegram source contracts
src/data/products.json           generated catalog snapshot
src/data/catalog.ts              typed snapshot loader
src/domain/catalog.ts            search, filter and sort functions
src/domain/cart.ts               cart reducer and totals
src/domain/order.ts              checkout validation and order formatter
src/hooks/useCart.tsx            cart context and localStorage persistence
src/components/Layout.tsx        header, navigation, cart control and footer
src/components/Hero.tsx          signature glass-garden hero
src/components/TrustStrip.tsx    originality, pricing and selection claims
src/components/ProductCard.tsx   catalog item summary and actions
src/components/ProductGrid.tsx   product result and empty state
src/components/CatalogControls.tsx search, filters and sort controls
src/pages/HomePage.tsx           hero, featured items, trust, delivery and contacts
src/pages/CatalogPage.tsx        searchable/filterable catalog
src/pages/ProductPage.tsx        product detail and source link
src/pages/CartPage.tsx           quantities, removal and totals
src/pages/CheckoutPage.tsx       customer form and Telegram handoff
src/test/setup.ts                DOM test environment
src/**/*.test.ts(x)              unit and component tests beside source files
tests/storefront.spec.ts         mobile and desktop purchase-flow tests
public/products/*                downloaded Telegram product images
```

---

### Task 1: Scaffold the tested storefront and product contract

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Create: `src/types/product.ts`
- Create: `src/data/products.json`
- Create: `src/data/catalog.ts`
- Test: `src/data/catalog.test.ts`

**Interfaces:**
- Produces: `Product`, `ProductGender`, `ProductAvailability`, `getProducts(): Product[]`, and application routes `/`, `/catalog`, `/product/:slug`, `/cart`, `/checkout`.

- [ ] **Step 1: Write the failing typed catalog test**

```ts
// src/data/catalog.test.ts
import { describe, expect, it } from 'vitest';
import { getProducts } from './catalog';

describe('getProducts', () => {
  it('returns products with stable source links', () => {
    const products = getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      brand: expect.any(String),
      name: expect.any(String),
    });
    expect(products[0].sourceUrl).toMatch(/^https:\/\/t\.me\/jardinnsecret\/\d+$/);
  });
});
```

- [ ] **Step 2: Run the test to verify the project is not scaffolded**

Run: `npm test -- --run src/data/catalog.test.ts`

Expected: FAIL because `package.json` and catalog modules do not exist.

- [ ] **Step 3: Add tooling, scripts, routes, and the exact product contract**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "test:e2e": "playwright test",
    "import:telegram": "tsx scripts/import-telegram.ts"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "cheerio": "latest",
    "lucide-react": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-router-dom": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "jsdom": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

```ts
// src/types/product.ts
export type ProductGender = 'women' | 'men' | 'unisex' | 'unknown';
export type ProductAvailability = 'in-stock' | 'ask-manager';

export interface Product {
  id: string;
  slug: string;
  brand: string;
  name: string;
  volumeMl: number | null;
  priceRub: number | null;
  gender: ProductGender;
  availability: ProductAvailability;
  description: string;
  notes: string[];
  imageUrl: string;
  sourceUrl: string;
  sourcePostId: number;
  publishedAt: string | null;
}
```

Seed `products.json` with one verified post from the channel so the contract test is deterministic before the full import:

```json
[
  {
    "id": "1739-parfums-de-marly-althair",
    "slug": "parfums-de-marly-althair",
    "brand": "Parfums de Marly",
    "name": "Althaïr",
    "volumeMl": 125,
    "priceRub": 22200,
    "gender": "unknown",
    "availability": "in-stock",
    "description": "",
    "notes": [],
    "imageUrl": "/products/placeholder.webp",
    "sourceUrl": "https://t.me/jardinnsecret/1739",
    "sourcePostId": 1739,
    "publishedAt": null
  }
]
```

- [ ] **Step 4: Install dependencies and run the test**

Run: `npm install && npm test -- --run src/data/catalog.test.ts`

Expected: 1 passing test.

- [ ] **Step 5: Commit the scaffold**

```bash
git add package.json package-lock.json vite.config.ts playwright.config.ts index.html src
git commit -m "chore: scaffold Jardin Secret storefront"
```

---

### Task 2: Import and deduplicate products from the public Telegram channel

**Files:**
- Create: `scripts/lib/telegram-parser.ts`
- Create: `scripts/import-telegram.ts`
- Create: `scripts/fixtures/channel.html`
- Test: `scripts/lib/telegram-parser.test.ts`
- Modify: `src/data/products.json`
- Create: `public/products/placeholder.webp`
- Create: `public/products/<post-id>-<index>.<ext>`

**Interfaces:**
- Consumes: `Product` from `src/types/product.ts`.
- Produces: `parseChannelPage(html: string): ParsedPost[]`, `postToProduct(post: ParsedPost): Product | null`, `dedupeProducts(products: Product[]): Product[]`, and a generated catalog sorted by newest source post.

- [ ] **Step 1: Save a small real-structure HTML fixture and write parser tests**

```ts
// scripts/lib/telegram-parser.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dedupeProducts, parseChannelPage, postToProduct } from './telegram-parser';

const html = readFileSync('scripts/fixtures/channel.html', 'utf8');

describe('Telegram product parser', () => {
  it('extracts an explicit product price and volume', () => {
    const posts = parseChannelPage(html);
    const product = postToProduct(posts.find((post) => post.id === 1739)!);
    expect(product).toMatchObject({
      brand: 'Parfums de Marly',
      name: 'Althaïr',
      volumeMl: 125,
      priceRub: 22200,
      availability: 'in-stock',
    });
  });

  it('rejects editorial posts without a concrete offer', () => {
    const posts = parseChannelPage(html);
    expect(postToProduct(posts.find((post) => post.id === 1736)!)).toBeNull();
  });

  it('keeps the newest and most complete duplicate', () => {
    const products = parseChannelPage(html).map(postToProduct).filter(Boolean);
    expect(dedupeProducts(products).filter((item) => item.slug.includes('imagination'))).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the focused parser tests and verify failure**

Run: `npm test -- --run scripts/lib/telegram-parser.test.ts`

Expected: FAIL because parser functions do not exist.

- [ ] **Step 3: Implement bounded page parsing and conservative product recognition**

```ts
// scripts/lib/telegram-parser.ts
import { load } from 'cheerio';
import type { Product } from '../../src/types/product';

export interface ParsedPost {
  id: number;
  text: string;
  imageUrls: string[];
  publishedAt: string | null;
}

export function parseChannelPage(html: string): ParsedPost[] {
  const $ = load(html);
  return $('.tgme_widget_message_wrap').map((_, element) => {
    const root = $(element);
    const dataPost = root.find('.tgme_widget_message').attr('data-post') ?? '';
    const id = Number(dataPost.split('/').pop());
    const text = root.find('.tgme_widget_message_text').text().replace(/\s+/g, ' ').trim();
    const imageUrls = root.find('.tgme_widget_message_photo_wrap').map((__, photo) => {
      const style = $(photo).attr('style') ?? '';
      return style.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1] ?? '';
    }).get().filter(Boolean);
    return { id, text, imageUrls, publishedAt: root.find('time').attr('datetime') ?? null };
  }).get().filter((post) => Number.isFinite(post.id));
}
```

Implement `postToProduct` with these explicit rules: require a perfume-like brand/name phrase plus at least one commercial marker (`в наличии`, `цена`, a ruble price, or `заказать`); reject list posts containing three or more separately named fragrances without a single product price; parse `22.200₽`, `22 200 ₽`, and `22200 руб` as `22200`; parse `125мл` as `125`; never infer gender; and map unknown fields to `null` or `unknown`. Normalize brand aliases, create Cyrillic-safe ASCII slugs, and use `sourcePostId` as a stable tie-breaker.

- [ ] **Step 4: Run parser tests and verify green**

Run: `npm test -- --run scripts/lib/telegram-parser.test.ts`

Expected: 3 passing tests.

- [ ] **Step 5: Implement the channel crawler and asset downloader**

`scripts/import-telegram.ts` requests `https://t.me/s/jardinnsecret`, reads the oldest visible post ID, follows `?before=<id>` until no lower ID appears, waits 350ms between requests, retries transient 429/5xx responses three times with backoff, and aborts on repeated failure. It collects posts, calls `postToProduct`, deduplicates, downloads the first usable photo per product to `public/products`, and writes formatted JSON atomically through a temporary file renamed to `src/data/products.json`. It prints counts for pages, posts, accepted products, duplicates, missing prices, and failed images.

- [ ] **Step 6: Run the full import and inspect its report**

Run: `npm run import:telegram`

Expected: exit 0; more than one accepted product; every output item has a unique `id`, `slug`, and `sourcePostId`; failed images use `/products/placeholder.webp`.

- [ ] **Step 7: Validate the generated snapshot**

Run: `npm test -- --run src/data/catalog.test.ts scripts/lib/telegram-parser.test.ts && node -e "const p=require('./src/data/products.json'); if(!p.length||new Set(p.map(x=>x.slug)).size!==p.length) process.exit(1); console.log(p.length+' unique products')"`

Expected: all tests pass and the command prints a positive unique product count.

- [ ] **Step 8: Commit importer and snapshot**

```bash
git add scripts src/data/products.json public/products
git commit -m "feat: import Jardin Secret Telegram catalog"
```

---

### Task 3: Add deterministic search, filtering, sorting, and catalog UI

**Files:**
- Create: `src/domain/catalog.ts`
- Test: `src/domain/catalog.test.ts`
- Create: `src/components/CatalogControls.tsx`
- Create: `src/components/ProductCard.tsx`
- Create: `src/components/ProductGrid.tsx`
- Create: `src/pages/CatalogPage.tsx`
- Test: `src/pages/CatalogPage.test.tsx`

**Interfaces:**
- Consumes: `Product[]` from `getProducts()`.
- Produces: `CatalogQuery`, `filterProducts(products, query): Product[]`, accessible catalog controls, product links, and add-to-cart callbacks.

- [ ] **Step 1: Write failing domain tests for Russian search and unknown values**

```ts
// src/domain/catalog.test.ts
import { describe, expect, it } from 'vitest';
import { filterProducts } from './catalog';
import type { Product } from '../types/product';

const products = [
  { id: '1', slug: 'lv-imagination', brand: 'Louis Vuitton', name: 'Imagination', priceRub: 45500, volumeMl: 100, gender: 'unisex', availability: 'in-stock' },
  { id: '2', slug: 'amouage-guidance', brand: 'Amouage', name: 'Guidance', priceRub: null, volumeMl: null, gender: 'unknown', availability: 'ask-manager' },
] as Product[];

describe('filterProducts', () => {
  it('searches brand and name case-insensitively', () => {
    expect(filterProducts([...products], { search: 'amouage' }).map((p) => p.id)).toEqual(['2']);
  });
  it('keeps unknown prices when no price filter is active', () => {
    expect(filterProducts([...products], {}).map((p) => p.id)).toEqual(['1', '2']);
  });
  it('sorts unknown prices after known prices', () => {
    expect(filterProducts([...products], { sort: 'price-asc' }).map((p) => p.id)).toEqual(['1', '2']);
  });
});
```

- [ ] **Step 2: Run catalog domain tests and verify failure**

Run: `npm test -- --run src/domain/catalog.test.ts`

Expected: FAIL because `filterProducts` is missing.

- [ ] **Step 3: Implement the pure catalog query**

Define `CatalogQuery` with optional `search`, `brand`, `gender`, `availability`, `minPrice`, `maxPrice`, and `sort: 'newest' | 'price-asc' | 'price-desc' | 'name'`. Normalize search with `toLocaleLowerCase('ru-RU')`, apply active filters only, keep `null` prices only when no price bound is active, and use `sourcePostId` descending as the stable default.

- [ ] **Step 4: Run catalog domain tests**

Run: `npm test -- --run src/domain/catalog.test.ts`

Expected: 3 passing tests.

- [ ] **Step 5: Write and implement the catalog component test**

```tsx
// src/pages/CatalogPage.test.tsx
it('filters cards and offers a reset when nothing matches', async () => {
  render(<CatalogPage />);
  await userEvent.type(screen.getByRole('searchbox', { name: 'Поиск ароматов' }), 'несуществующий аромат');
  expect(screen.getByText('В саду такого аромата пока нет')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
  expect(screen.getAllByTestId('product-card').length).toBeGreaterThan(0);
});
```

Build controls from actual brands in the snapshot, keep filter state in URL search parameters, announce the result count through `aria-live`, and show `Уточнить у менеджера` for missing price or volume.

- [ ] **Step 6: Run domain and component catalog tests**

Run: `npm test -- --run src/domain/catalog.test.ts src/pages/CatalogPage.test.tsx`

Expected: all tests pass.

- [ ] **Step 7: Commit catalog discovery**

```bash
git add src/domain src/components src/pages/CatalogPage.tsx src/pages/CatalogPage.test.tsx
git commit -m "feat: add searchable perfume catalog"
```

---

### Task 4: Build the glass-garden visual system, shell, and home page

**Files:**
- Create: `src/styles.css`
- Create: `src/components/Layout.tsx`
- Create: `src/components/Hero.tsx`
- Create: `src/components/TrustStrip.tsx`
- Create: `src/pages/HomePage.tsx`
- Test: `src/pages/HomePage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `index.html`

**Interfaces:**
- Consumes: featured products from `getProducts()` and cart count from `useCart()`.
- Produces: responsive shared navigation, brand presentation, catalog entry points, contacts, delivery copy, and required creator credit.

- [ ] **Step 1: Write a failing content and landmark test**

```tsx
// src/pages/HomePage.test.tsx
it('renders the brand promise, contacts, and creator credit', () => {
  renderAppAt('/');
  expect(screen.getByRole('heading', { name: 'Ваш тайный сад ароматов' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Написать менеджеру' })).toHaveAttribute('href', 'https://t.me/jardinmanager');
  expect(screen.getByText('Сайт сделал verbtw')).toBeVisible();
  expect(screen.getByRole('contentinfo')).toBeVisible();
});
```

- [ ] **Step 2: Run the home page test and verify failure**

Run: `npm test -- --run src/pages/HomePage.test.tsx`

Expected: FAIL because the brand UI is missing.

- [ ] **Step 3: Implement tokens and the signature hero**

Declare CSS custom properties for the six approved colors, a restrained display/body font pair with local fallbacks, fluid type through `clamp`, 360px mobile breakpoints, visible `:focus-visible`, and `@media (prefers-reduced-motion: reduce)`. Build the hero as accessible HTML with one decorative glass-orb composition marked `aria-hidden="true"`; do not scatter unrelated animations.

- [ ] **Step 4: Build the home sections and shared shell**

Use semantic `header`, `nav`, `main`, `section`, and `footer`. Include the three trust statements, 4–8 featured products, public channel facts, Russia/CIS delivery, all four Telegram contacts, and the exact `Сайт сделал verbtw` credit. Avoid unsupported guarantees beyond the channel’s published “100% original” positioning.

- [ ] **Step 5: Run the home test and production build**

Run: `npm test -- --run src/pages/HomePage.test.tsx && npm run build`

Expected: test passes and Vite build exits 0.

- [ ] **Step 6: Commit the visual foundation**

```bash
git add index.html src/App.tsx src/styles.css src/components src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: create Jardin Secret glass-garden experience"
```

---

### Task 5: Add product details and a persistent cart

**Files:**
- Create: `src/domain/cart.ts`
- Test: `src/domain/cart.test.ts`
- Create: `src/hooks/useCart.tsx`
- Test: `src/hooks/useCart.test.tsx`
- Create: `src/pages/ProductPage.tsx`
- Create: `src/pages/CartPage.tsx`
- Test: `src/pages/CartPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Produces: `CartLine { productId: string; quantity: number }`, `cartReducer`, `useCart()` with `lines`, `add`, `setQuantity`, `remove`, `clear`, `itemCount`, and `knownSubtotal`.

- [ ] **Step 1: Write failing reducer tests**

```ts
// src/domain/cart.test.ts
it('adds the same product by incrementing quantity', () => {
  const once = cartReducer([], { type: 'add', productId: '1739' });
  const twice = cartReducer(once, { type: 'add', productId: '1739' });
  expect(twice).toEqual([{ productId: '1739', quantity: 2 }]);
});

it('removes zero-quantity lines', () => {
  expect(cartReducer([{ productId: '1739', quantity: 1 }], { type: 'set', productId: '1739', quantity: 0 })).toEqual([]);
});
```

- [ ] **Step 2: Run cart tests and verify failure**

Run: `npm test -- --run src/domain/cart.test.ts`

Expected: FAIL because the reducer is missing.

- [ ] **Step 3: Implement the reducer, context, and safe persistence**

Use localStorage key `jardin-secret-cart-v1`. Parse stored JSON inside `try/catch`, discard lines whose products no longer exist, clamp quantities to integers from 1 through 20, and write only after hydration. `knownSubtotal` sums priced items; the UI separately states how many lines require manager confirmation.

- [ ] **Step 4: Write and run persistence tests**

Render `CartProvider` with a small probe component, add a product, verify the serialized value, unmount, render again, and assert the restored item count. Also seed invalid JSON and assert an empty cart without an exception.

Run: `npm test -- --run src/domain/cart.test.ts src/hooks/useCart.test.tsx`

Expected: all cart and persistence tests pass.

- [ ] **Step 5: Implement product and cart pages**

The product route resolves by `slug`, returns an accessible not-found state with a catalog link, exposes the Telegram source post, and provides add-to-cart plus direct manager actions. The cart exposes labeled quantity controls, removal, clear-cart, known subtotal, manager-confirmed pricing copy, empty state, and checkout navigation.

- [ ] **Step 6: Run cart page tests and build**

Run: `npm test -- --run src/domain/cart.test.ts src/hooks/useCart.test.tsx src/pages/CartPage.test.tsx && npm run build`

Expected: all tests pass and the build exits 0.

- [ ] **Step 7: Commit product and cart flow**

```bash
git add src/App.tsx src/domain/cart.ts src/domain/cart.test.ts src/hooks src/components src/pages/ProductPage.tsx src/pages/CartPage.tsx src/pages/CartPage.test.tsx
git commit -m "feat: add product details and persistent cart"
```

---

### Task 6: Add checkout validation and resilient Telegram handoff

**Files:**
- Create: `src/domain/order.ts`
- Test: `src/domain/order.test.ts`
- Create: `src/pages/CheckoutPage.tsx`
- Test: `src/pages/CheckoutPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `CheckoutValues`, `CheckoutErrors`, `validateCheckout(values): CheckoutErrors`, and `formatOrder(values, lines, products): string`.

- [ ] **Step 1: Write failing validation and formatting tests**

```ts
// src/domain/order.test.ts
it('requires contact and delivery details', () => {
  expect(validateCheckout({ name: '', phone: '', city: '', address: '', delivery: '', comment: '' })).toEqual({
    name: 'Укажите имя',
    phone: 'Укажите телефон',
    city: 'Укажите город',
    address: 'Укажите адрес или пункт выдачи',
    delivery: 'Выберите способ доставки',
  });
});

it('marks unknown prices for manager confirmation', () => {
  const text = formatOrder(validValues, [{ productId: '2', quantity: 1 }], products);
  expect(text).toContain('Amouage Guidance — 1 шт. — цену уточнить');
  expect(text).toContain('Телефон: +7 999 000-00-00');
});
```

- [ ] **Step 2: Run order tests and verify failure**

Run: `npm test -- --run src/domain/order.test.ts`

Expected: FAIL because order functions are missing.

- [ ] **Step 3: Implement pure validation and formatter functions**

Trim all strings, require the five specified fields, accept phone characters `+() -` with at least 10 digits, number lines in display order, format known prices with `Intl.NumberFormat('ru-RU')`, include source URLs, and append the disclaimer `Стоимость и наличие подтвердит менеджер.`.

- [ ] **Step 4: Run order tests**

Run: `npm test -- --run src/domain/order.test.ts`

Expected: all order tests pass.

- [ ] **Step 5: Implement checkout and clipboard fallback**

On submit, focus the first invalid control without clearing values. For valid input, reveal the formatted order in a labeled readonly textarea, attempt `navigator.clipboard.writeText`, show either `Заказ скопирован` or `Не удалось скопировать автоматически — выделите текст ниже`, then expose `Открыть @jardinmanager` with `target="_blank"` and `rel="noreferrer"`. Never claim the message was sent automatically.

- [ ] **Step 6: Test success and blocked-clipboard flows**

```tsx
it('keeps a selectable order when clipboard access is denied', async () => {
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('blocked'));
  renderAppWithCart('/checkout');
  await fillValidCheckout();
  await userEvent.click(screen.getByRole('button', { name: 'Сформировать заказ' }));
  expect(await screen.findByText('Не удалось скопировать автоматически — выделите текст ниже')).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Готовый текст заказа' })).toHaveValue(expect.stringContaining('Стоимость и наличие подтвердит менеджер.'));
});
```

Run: `npm test -- --run src/domain/order.test.ts src/pages/CheckoutPage.test.tsx`

Expected: all checkout tests pass.

- [ ] **Step 7: Commit checkout**

```bash
git add src/App.tsx src/domain/order.ts src/domain/order.test.ts src/pages/CheckoutPage.tsx src/pages/CheckoutPage.test.tsx
git commit -m "feat: add Telegram order checkout"
```

---

### Task 7: Verify responsive, accessible, and complete storefront behavior

**Files:**
- Create: `tests/storefront.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `src/styles.css`
- Modify: application files only when a browser test reveals a concrete issue

**Interfaces:**
- Consumes: the complete storefront.
- Produces: verified desktop and 390px mobile purchase paths with no JavaScript console errors.

- [ ] **Step 1: Write the desktop and mobile browser tests**

```ts
// tests/storefront.spec.ts
import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`catalog to Telegram checkout at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('link', { name: 'Смотреть каталог' }).click();
    await page.getByTestId('product-card').first().getByRole('button', { name: 'Добавить в корзину' }).click();
    await page.getByRole('link', { name: /Корзина/ }).click();
    await page.getByRole('link', { name: 'Оформить заказ' }).click();
    await page.getByLabel('Имя').fill('Анна');
    await page.getByLabel('Телефон').fill('+7 999 000-00-00');
    await page.getByLabel('Город').fill('Москва');
    await page.getByLabel('Адрес или пункт выдачи').fill('ПВЗ на Тверской');
    await page.getByLabel('Способ доставки').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Сформировать заказ' }).click();
    await expect(page.getByRole('textbox', { name: 'Готовый текст заказа' })).toHaveValue(/Анна/);
    await expect(page.getByRole('link', { name: 'Открыть @jardinmanager' })).toHaveAttribute('href', 'https://t.me/jardinmanager');
  });
}
```

- [ ] **Step 2: Run browser tests and capture concrete failures**

Run: `npx playwright install chromium && npm run build && npm run test:e2e`

Expected: failures identify any incomplete selector, overflow, or checkout behavior before polish.

- [ ] **Step 3: Fix only observed browser failures and inspect key layouts**

Use the browser at 1440×1000 and 390×844. Confirm no horizontal overflow, no clipped controls, readable product cards, visible focus, stable image placeholders, a usable mobile menu, and a clear manual-copy fallback. Adjust `src/styles.css` or the responsible component for each observed defect.

- [ ] **Step 4: Run the full verification suite**

Run: `npm test -- --run && npm run build && npm run test:e2e`

Expected: unit/component tests report 0 failures, build exits 0, and both Playwright viewport scenarios pass.

- [ ] **Step 5: Check requirements directly**

Run: `rg -n "jardinnsecret|jardinmanager|jardinotzivi|aminakulieva|Сайт сделал verbtw|Россия|СНГ" src && git diff --check && git status --short`

Expected: all required copy and contacts are present, no whitespace errors are reported, and only intended files are modified.

- [ ] **Step 6: Commit verified polish**

```bash
git add tests playwright.config.ts src
git commit -m "test: verify responsive storefront purchase flow"
```

## Completion Checklist

- [ ] Imported products are traceable to public Telegram post URLs and deduplicated.
- [ ] Unknown details display “Уточнить у менеджера”.
- [ ] Home, catalog, detail, cart, and checkout routes work from 360px upward.
- [ ] Cart persists safely through reloads and malformed stored data.
- [ ] Checkout validates data, formats a complete order, and survives clipboard denial.
- [ ] Telegram contacts, Russia/CIS delivery, originality positioning, and verbtw credit are visible.
- [ ] Unit, component, build, and end-to-end verification commands pass with fresh output.
