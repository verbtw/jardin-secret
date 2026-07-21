# Daily Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recalculate retail prices daily from EParfume cost and exact competitor matches while preserving a minimum 1,500 ₽ profit and all manual overrides.

**Architecture:** Pure pricing functions are isolated from competitor adapters. A scheduled server task stores competitor observations, pricing decisions and anomaly flags before publishing safe prices.

**Tech Stack:** TypeScript, Supabase Postgres, Vitest, Vercel Functions/Cron

## Global Constraints

- Exact competitor match requires brand, fragrance, flanker, concentration and volume.
- Target price is 2,000–3,000 ₽ below the lowest competitor.
- Normal target profit is about 5,000 ₽; large gaps may yield 8,000–10,000 ₽.
- Automatic price must retain at least 1,500 ₽ profit.
- With no competitor match, use cost + 5,000 ₽.
- Round retail prices to the nearest 100 ₽.
- Manual price overrides are never overwritten until explicitly cleared.

---

### Task 1: Pricing domain function

**Files:**
- Create: `src/domain/pricing.ts`
- Create: `src/domain/pricing.test.ts`

**Interfaces:**
- Produces: `calculateRetailPrice(input: PricingInput): PricingDecision`.

- [ ] **Step 1: Write all pricing branch tests**

```ts
expect(calculateRetailPrice({costRub:20000, competitorPrices:[29000]}).priceRub).toBe(27000);
expect(calculateRetailPrice({costRub:20000, competitorPrices:[]}).priceRub).toBe(25000);
expect(calculateRetailPrice({costRub:20000, competitorPrices:[21500]})).toMatchObject({priceRub:null, reason:"margin_below_floor"});
expect(calculateRetailPrice({costRub:20149, competitorPrices:[]}).priceRub).toBe(25100);
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run src/domain/pricing.test.ts`
Expected: FAIL because the function is missing.

- [ ] **Step 3: Implement deterministic calculation**

```ts
export function calculateRetailPrice(input: PricingInput): PricingDecision {
  const lowest = Math.min(...input.competitorPrices.filter(Number.isFinite));
  const raw = Number.isFinite(lowest) ? Math.min(lowest - 2000, input.costRub + 10000) : input.costRub + 5000;
  const rounded = Math.round(raw / 100) * 100;
  if (rounded - input.costRub < 1500) return {priceRub:null, profitRub:null, reason:"margin_below_floor"};
  return {priceRub:rounded, profitRub:rounded-input.costRub, reason:Number.isFinite(lowest)?"competitor_discount":"default_margin"};
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- --run src/domain/pricing.test.ts`
Expected: PASS.

```bash
git add src/domain/pricing.ts src/domain/pricing.test.ts
git commit -m "feat: calculate safe retail fragrance prices"
```

### Task 2: Competitor observations and decisions schema

**Files:**
- Create: `supabase/migrations/202607210002_create_pricing.sql`
- Test: `supabase/tests/pricing_schema.sql`

**Interfaces:**
- Produces: `competitor_offers`, `pricing_decisions`, override columns and anomaly flags.

- [ ] **Step 1: Add pgTAP assertions for private pricing tables**
- [ ] **Step 2: Run schema test and confirm failure**
- [ ] **Step 3: Add the tables, indexes, constraints and service-role-only grants**

```sql
create table public.pricing_decisions (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  cost_rub integer not null,
  calculated_price_rub integer,
  profit_rub integer,
  rule text not null,
  inputs jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.products add column manual_price_rub integer;
alter table public.products add column price_mode text not null default 'auto' check (price_mode in ('auto','manual'));
```

- [ ] **Step 4: Verify anon/authenticated cannot read commercial tables**

Run: `supabase db reset && supabase test db supabase/tests/pricing_schema.sql`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202607210002_create_pricing.sql supabase/tests/pricing_schema.sql
git commit -m "feat: store competitor and pricing decisions"
```

### Task 3: Competitor matching adapters

**Files:**
- Create: `scripts/pricing/competitor-types.ts`
- Create: `scripts/pricing/match-competitor.ts`
- Create: `scripts/pricing/match-competitor.test.ts`
- Create: `scripts/pricing/randewoo.ts`
- Create: `scripts/pricing/goldapple.ts`

**Interfaces:**
- Produces: `findExactOffer(product): Promise<CompetitorOffer | null>` per source.

- [ ] **Step 1: Test rejection of wrong volume, flanker, concentration, set and tester**

```ts
expect(matchCompetitor(product50Edp, candidate100Edp).exact).toBe(false);
expect(matchCompetitor(product50Edp, candidate50Parfum).exact).toBe(false);
expect(matchCompetitor(product50Edp, candidate50Edp).exact).toBe(true);
```

- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement normalized exact matching and source adapters**
- [ ] **Step 4: Persist URL, observed price, price kind and timestamp**
- [ ] **Step 5: Run tests and commit**

Run: `npm test -- --run scripts/pricing/match-competitor.test.ts`
Expected: PASS.

```bash
git add scripts/pricing
git commit -m "feat: match exact competitor fragrance offers"
```

### Task 4: Daily pricing job and anomaly protection

**Files:**
- Create: `api/cron/sync-catalog.ts`
- Create: `scripts/pricing/run-daily-sync.ts`
- Create: `scripts/pricing/run-daily-sync.test.ts`
- Create: `vercel.json`

**Interfaces:**
- Produces: authenticated cron endpoint and `runDailySync(deps)` summary.

- [ ] **Step 1: Test manual override protection, failure isolation and anomaly thresholds**

```ts
expect(afterSync.manualPriceRub).toBe(27900);
expect(afterSync.retailPriceRub).toBe(27900);
expect(summary.flagged).toContain(productWithPriceJump.id);
```

- [ ] **Step 2: Run and confirm failure**
- [ ] **Step 3: Implement catalog import → competitor observations → decisions transaction flow**
- [ ] **Step 4: Require `Authorization: Bearer ${CRON_SECRET}` and schedule daily execution**

```json
{"crons":[{"path":"/api/cron/sync-catalog","schedule":"20 2 * * *"}]}
```

- [ ] **Step 5: Run focused and full test suites**

Run: `npm test -- --run scripts/pricing/run-daily-sync.test.ts && npm test -- --run && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api scripts/pricing vercel.json
git commit -m "feat: schedule protected daily catalog pricing sync"
```

