# Customer Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import text-only Telegram testimonials and let signed-in customers submit one moderated review after a completed order.

**Architecture:** Imported Telegram reviews live in static JSON and retain source links. Website orders and reviews live in Supabase under RLS; the public UI merges published database reviews with imported posts while failures degrade to the static Telegram list.

**Tech Stack:** TypeScript, Cheerio, React, Supabase/Postgres, Vitest, Testing Library, Playwright

## Global Constraints

- Import only text from `@jardinotzivi`; do not download or store review media.
- Guests may read published reviews but may not submit them.
- A website review requires an owned order with status `completed` and is limited to one per order.
- Website reviews require moderation before public display.
- Checkout and Telegram ordering continue to work if review storage is unavailable.

---

### Task 1: Parse and import text-only Telegram reviews

**Files:**
- Create: `scripts/lib/telegram-review-parser.ts`
- Test: `scripts/lib/telegram-review-parser.test.ts`
- Create: `scripts/import-telegram-reviews.ts`
- Create: `scripts/fixtures/reviews-channel.html`
- Create: `src/data/telegram-reviews.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `TelegramReview { id, text, publishedAt, sourcePostId, sourceUrl, authorLabel }` and `parseReviewChannelPage(html)`.
- Consumes: `https://t.me/s/jardinotzivi` HTML.

- [ ] **Step 1: Write failing parser tests**

```ts
it('extracts text and source metadata without media URLs', () => {
  const [review] = parseReviewChannelPage(fixture);
  expect(review.text).toContain('аромат');
  expect(review.sourceUrl).toBe('https://t.me/jardinotzivi/42');
  expect(JSON.stringify(review)).not.toMatch(/\.jpg|\.mp4|background-image/);
});

it('drops a media-only post', () => {
  expect(parseReviewChannelPage(mediaOnlyFixture)).toEqual([]);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- scripts/lib/telegram-review-parser.test.ts --run`

Expected: FAIL because the parser does not exist.

- [ ] **Step 3: Implement parser and crawler**

Use Cheerio selectors `.tgme_widget_message`, `data-post`, `.tgme_widget_message_text`, and `<time datetime>`. Normalize whitespace, discard text shorter than 20 characters, use the first non-empty line as author only when it is 2–40 characters and contains no URL/price, otherwise set `authorLabel` to `Покупатель Jardin Secret`.

- [ ] **Step 4: Add idempotent output**

Key reviews by numeric `sourcePostId`, crawl backwards with `?before=`, sort newest first, and write only `src/data/telegram-reviews.json`. Do not fetch any media URL.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- scripts/lib/telegram-review-parser.test.ts --run && npm run import:reviews`

Expected: parser tests PASS and JSON contains unique text-only records.

```bash
git add scripts src/data/telegram-reviews.json package.json package-lock.json
git commit -m "content: import text reviews from Telegram"
```

### Task 2: Add protected orders and reviews schema

**Files:**
- Create: `supabase/migrations/202607190002_create_orders_and_reviews.sql`
- Create: `src/reviews/review-types.ts`
- Test: `src/reviews/review-types.test.ts`

**Interfaces:**
- Produces: `orders`, `reviews`, and public `published_reviews` view/RPC.
- Consumes: `profiles` and authenticated user IDs from the accounts release.

- [ ] **Step 1: Write failing client validation tests**

```ts
it('requires a 1–5 rating and 20–1500 characters', () => {
  expect(validateReview({ rating: 0, text: 'коротко' })).toEqual({
    rating: 'Выберите оценку от 1 до 5.',
    text: 'Напишите отзыв длиной от 20 до 1500 символов.'
  });
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/reviews/review-types.test.ts --run`

Expected: FAIL because review validation is missing.

- [ ] **Step 3: Create database constraints and RLS**

Create `orders(id uuid, user_id uuid, public_code text unique, status pending|completed|cancelled, items jsonb, created_at, completed_at)` and `reviews(id uuid, user_id uuid, order_id uuid unique, product_id text null, rating int check 1..5, body text check length 20..1500, status pending|published|rejected, created_at)`. Policies allow own-order select/insert, own-review select, and review insert only when the matching owned order is `completed`. Public access returns only a safe published projection with display name and no contact fields.

- [ ] **Step 4: Implement matching client validation**

Export `ReviewDraft`, `ReviewErrors`, and `validateReview` using the exact database limits so failures are caught before submission.

- [ ] **Step 5: Verify migration and commit**

Run migration validation against the linked Supabase project and run `npm test -- src/reviews/review-types.test.ts --run`.

```bash
git add supabase/migrations/202607190002_create_orders_and_reviews.sql src/reviews
git commit -m "feat: secure customer orders and reviews"
```

### Task 3: Record authenticated checkout orders

**Files:**
- Create: `src/orders/order-service.ts`
- Test: `src/orders/order-service.test.ts`
- Modify: `src/pages/CheckoutPage.tsx`
- Test: `src/pages/CheckoutPage.test.tsx`

**Interfaces:**
- Produces: `createOrder(userId, lines, products): Promise<{ id, publicCode }>`.
- Consumes: authenticated user, cart lines, and product snapshot.

- [ ] **Step 1: Write the failing snapshot test**

```ts
it('stores only the order snapshot needed for verification', () => {
  expect(toOrderItems(lines, products)).toEqual([{ productId: 'p1', name: 'Brand Name', quantity: 2, priceRub: 12000 }]);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/orders/order-service.test.ts --run`

Expected: FAIL because `toOrderItems` does not exist.

- [ ] **Step 3: Implement safe order creation**

Generate a non-secret display code such as `JS-7K4P2Q`, persist the immutable items snapshot, and return the row ID/code. Never store checkout address inside the review tables.

- [ ] **Step 4: Integrate without breaking guest checkout**

After valid checkout submission, create an order only for a signed-in user. If Supabase fails, still format/copy the Telegram message and display a secondary warning that the order will not appear in the account.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/orders/order-service.test.ts src/pages/CheckoutPage.test.tsx --run`

Expected: authenticated and guest checkout tests PASS.

```bash
git add src/orders src/pages/CheckoutPage.tsx src/pages/CheckoutPage.test.tsx
git commit -m "feat: record authenticated checkout orders"
```

### Task 4: Reviews list and product integration

**Files:**
- Create: `src/reviews/review-service.ts`
- Create: `src/components/ReviewCard.tsx`
- Create: `src/components/ReviewsSection.tsx`
- Create: `src/pages/ReviewsPage.tsx`
- Test: `src/pages/ReviewsPage.test.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: merged `PublicReview[]`, `/reviews`, home preview, and product-specific list.
- Consumes: static Telegram JSON and published Supabase review projection.

- [ ] **Step 1: Write the failing merge test**

```ts
it('merges sources newest-first and keeps Telegram attribution', () => {
  expect(mergeReviews(telegram, website).map((item) => item.source)).toEqual(['website', 'telegram']);
  expect(mergeReviews(telegram, website)[1].sourceUrl).toContain('t.me/jardinotzivi');
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/pages/ReviewsPage.test.tsx --run`

Expected: FAIL because the review UI does not exist.

- [ ] **Step 3: Implement resilient public loading**

Always start with static Telegram reviews. When Supabase is configured, fetch the safe published projection and merge by date; on an error keep Telegram reviews and show no technical error to guests.

- [ ] **Step 4: Add list, navigation, home, and product sections**

Render rating stars only for website reviews, source label, date, text, and Telegram source link. Add `/reviews` navigation, a six-item homepage preview, and filter website reviews by `productId` on product pages.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/pages/ReviewsPage.test.tsx src/pages/HomePage.test.tsx src/pages/ProductPage.test.tsx --run`

Expected: public review surfaces PASS with and without Supabase.

```bash
git add src/reviews src/components/ReviewCard.tsx src/components/ReviewsSection.tsx src/pages/ReviewsPage.tsx src/pages/HomePage.tsx src/pages/ProductPage.tsx src/App.tsx src/components/Layout.tsx src/styles.css
git commit -m "feat: show customer reviews across storefront"
```

### Task 5: Post-purchase review form

**Files:**
- Create: `src/pages/OrderReviewPage.tsx`
- Test: `src/pages/OrderReviewPage.test.tsx`
- Modify: `src/pages/AccountPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `tests/storefront.spec.ts`

**Interfaces:**
- Produces: `/account/orders/:orderId/review` and account order list.
- Consumes: owned completed orders and review insert policy.

- [ ] **Step 1: Write failing access tests**

```tsx
it('blocks review submission for a pending order', async () => {
  renderOrderReview({ order: { status: 'pending' } });
  expect(await screen.findByText('Отзыв можно оставить после выполнения заказа.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Отправить отзыв' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/pages/OrderReviewPage.test.tsx --run`

Expected: FAIL because the page is missing.

- [ ] **Step 3: Implement account orders and form**

List the signed-in user's orders. For a completed order without a review, show the CTA. The review form uses radio buttons for rating, a textarea with counter, and a select limited to products in that order. Successful submission shows `Спасибо! Отзыв появится после модерации.`

- [ ] **Step 4: Run the full gate and deploy**

Run: `npm test -- --run && npm run build && npm run test:e2e`

Expected: all tests, build, desktop E2E, and mobile E2E exit 0.

Run: `vercel deploy --prod --yes`

Expected: target production and status `READY`.

- [ ] **Step 5: Commit and publish**

```bash
git add src/pages/OrderReviewPage.tsx src/pages/OrderReviewPage.test.tsx src/pages/AccountPage.tsx src/App.tsx src/styles.css tests/storefront.spec.ts
git commit -m "feat: add moderated post-purchase reviews"
git push -u origin main
```
