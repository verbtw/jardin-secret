# Supplier Catalog Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import only full-size fragrance products from all EParfume supplier lists into a normalized Supabase catalog without exposing supplier data.

**Architecture:** A server-only TypeScript importer authenticates with EParfume, reads the supplier list, course and paginated DataTables endpoints, normalizes source rows, and upserts product/offers through Supabase service-role access. The public React catalog reads only a restricted public view.

**Tech Stack:** TypeScript, Cheerio, fetch-cookie, tough-cookie, Supabase Postgres, Vitest, React/Vite

## Global Constraints

- Import only perfume, parfum, extrait, EDP, EDT and cologne products.
- Exclude cosmetics, diffusers, candles, home fragrance, samples, decants, sets, refills and testers from normal publication.
- Never expose EParfume credentials, supplier codes, course or wholesale prices to the browser.
- One public variant is brand + fragrance + flanker + concentration + volume.
- Missing products become unavailable; stable URLs and editorial fields remain.
- `portfolio-images/` remains untracked.

---

### Task 1: Catalog database model

**Files:**
- Create: `supabase/migrations/202607210001_create_catalog.sql`
- Test: `supabase/tests/catalog_schema.sql`

**Interfaces:**
- Produces: tables `products`, `supplier_offers`, `import_runs`, `product_sources`; view `public_catalog`.

- [ ] **Step 1: Write the failing schema assertions**

```sql
select has_table('public', 'products');
select has_table('public', 'supplier_offers');
select has_view('public', 'public_catalog');
select policies_are('public', 'products', array['products_public_read']);
```

- [ ] **Step 2: Run the schema test before the migration**

Run: `supabase test db supabase/tests/catalog_schema.sql`
Expected: FAIL because `products` does not exist.

- [ ] **Step 3: Add normalized tables and the restricted public view**

```sql
create table public.products (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  slug text not null unique,
  brand text not null,
  name text not null,
  flanker text,
  concentration text,
  volume_ml numeric(6,2) not null check (volume_ml > 0),
  retail_price_rub integer check (retail_price_rub > 0),
  availability text not null default 'review' check (availability in ('in_stock','out_of_stock','review')),
  description text not null default '',
  fragrance_family text,
  top_notes text[] not null default '{}',
  heart_notes text[] not null default '{}',
  base_notes text[] not null default '{}',
  image_url text,
  details_source_url text,
  published boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  supplier_code text not null,
  source_row text not null,
  source_price_usd numeric(12,2) not null,
  cost_rub integer not null,
  in_stock boolean not null default true,
  observed_at timestamptz not null,
  unique (supplier_code, source_row)
);
create view public.public_catalog with (security_invoker = true) as
select id, slug, brand, name, flanker, concentration, volume_ml,
       retail_price_rub, availability, description, fragrance_family,
       top_notes, heart_notes, base_notes, image_url
from public.products where published;
```

- [ ] **Step 4: Enable RLS and grant only public view-safe reads**

Run: `supabase db reset && supabase test db supabase/tests/catalog_schema.sql`
Expected: PASS and anon cannot select `supplier_offers`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202607210001_create_catalog.sql supabase/tests/catalog_schema.sql
git commit -m "feat: add normalized supplier catalog schema"
```

### Task 2: Fragrance row parser

**Files:**
- Create: `scripts/catalog/catalog-types.ts`
- Create: `scripts/catalog/parse-source-row.ts`
- Create: `scripts/catalog/parse-source-row.test.ts`

**Interfaces:**
- Produces: `parseSourceRow(sourceRow: string): ParsedFragrance | RejectedRow`.

- [ ] **Step 1: Write examples for accepted and rejected products**

```ts
expect(parseSourceRow("Tom Ford Oud Wood edp 50ml")).toMatchObject({
  kind: "fragrance", brand: "Tom Ford", name: "Oud Wood",
  concentration: "EDP", volumeMl: 50,
});
expect(parseSourceRow("dr. vranjes диффузор 250ml")).toMatchObject({kind:"rejected"});
expect(parseSourceRow("Kilian Angels Share tester 50ml")).toMatchObject({kind:"review"});
```

- [ ] **Step 2: Run the test and confirm missing module failure**

Run: `npm test -- --run scripts/catalog/parse-source-row.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement token cleanup, concentration and volume parsing**

```ts
export function parseSourceRow(sourceRow: string): ParseResult {
  const normalized = sourceRow.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (NON_FRAGRANCE.some((pattern) => pattern.test(normalized)))
    return {kind:"rejected", reason:"non_fragrance", sourceRow};
  if (REVIEW_ONLY.some((pattern) => pattern.test(normalized)))
    return {kind:"review", reason:"ambiguous_packaging", sourceRow};
  const volume = normalized.match(/(\d+(?:[.,]\d+)?)\s*ml\b/i);
  if (!volume) return {kind:"review", reason:"missing_volume", sourceRow};
  return parseBrandAndName(normalized, Number(volume[1].replace(",", ".")));
}
```

- [ ] **Step 4: Run parser tests**

Run: `npm test -- --run scripts/catalog/parse-source-row.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/catalog
git commit -m "feat: parse supplier fragrance rows"
```

### Task 3: EParfume read-only client

**Files:**
- Modify: `package.json`
- Create: `scripts/catalog/eparfume-client.ts`
- Create: `scripts/catalog/eparfume-client.test.ts`
- Create: `scripts/catalog/fixtures/prices.html`
- Create: `scripts/catalog/fixtures/price-response.json`

**Interfaces:**
- Produces: `EparfumeClient.login()`, `getExchangeRate()`, `listSuppliers()`, `readSupplierRows(priceId)`.

- [ ] **Step 1: Add fixture-driven client tests**

```ts
expect(await client.getExchangeRate()).toBe(82);
expect(await client.listSuppliers()).toContainEqual({code:"Y/D", priceId:"1156106322"});
expect(await client.readSupplierRows("1156106322")).toContainEqual({name:"100 bon desert mirage edt 50ml", priceUsd:25.6});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- --run scripts/catalog/eparfume-client.test.ts`
Expected: FAIL because `EparfumeClient` is missing.

- [ ] **Step 3: Install cookie-aware fetch and implement authentication**

Run: `npm install fetch-cookie@3 tough-cookie@5`

```ts
const body = new URLSearchParams({email, password, new_login:"1"});
const response = await this.fetch(`${this.baseUrl}/index.php`, {method:"POST", body});
if (!response.ok || (await response.text()).includes("name='new_login'"))
  throw new Error("EParfume authentication failed");
```

- [ ] **Step 4: Implement paginated DataTables reads**

```ts
for (let start = 0; start < recordsTotal; start += 200) {
  const body = new URLSearchParams({PriceID:priceId, start:String(start), length:"200", draw:String(draw++)});
  const page = await postJson("/js_getPriceList.php", body);
  rows.push(...page.data.map(parseDataTableRow));
}
```

- [ ] **Step 5: Verify fixture tests and a credential-free dry run**

Run: `npm test -- --run scripts/catalog/eparfume-client.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/catalog
git commit -m "feat: add read-only supplier catalog client"
```

### Task 4: Idempotent import orchestration

**Files:**
- Create: `scripts/catalog/import-catalog.ts`
- Create: `scripts/catalog/import-catalog.test.ts`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `EparfumeClient`, `parseSourceRow`.
- Produces: `runCatalogImport(deps): Promise<ImportSummary>`.

- [ ] **Step 1: Write an idempotency and lowest-cost test**

```ts
const first = await runCatalogImport(fixtureDeps);
const second = await runCatalogImport(fixtureDeps);
expect(first.productsPublished).toBe(1);
expect(second.productsCreated).toBe(0);
expect(repo.product("tom-ford-oud-wood-edp-50").costRub).toBe(12900);
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run scripts/catalog/import-catalog.test.ts`
Expected: FAIL because orchestration is missing.

- [ ] **Step 3: Implement canonical keys, upsert and stale marking**

```ts
const canonicalKey = [brand, name, flanker, concentration, volumeMl]
  .map(normalizeKeyPart).filter(Boolean).join("|");
await repo.upsertProduct(parsed, canonicalKey, observedAt);
await repo.upsertOffer({canonicalKey, supplierCode, sourceRow, priceUsd, costRub, observedAt});
await repo.markUnseenUnavailable(importStartedAt);
```

- [ ] **Step 4: Add server-only environment names**

```dotenv
EPARFUME_EMAIL=
EPARFUME_PASSWORD=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 5: Run importer tests and full suite**

Run: `npm test -- --run scripts/catalog/import-catalog.test.ts && npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/catalog package.json package-lock.json .env.example
git commit -m "feat: import supplier catalog idempotently"
```

### Task 5: Public database-backed catalog

**Files:**
- Create: `src/data/catalog-service.ts`
- Create: `src/data/catalog-service.test.ts`
- Create: `src/hooks/useCatalog.ts`
- Modify: `src/pages/CatalogPage.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/types/product.ts`

**Interfaces:**
- Produces: `listPublicProducts(): Promise<Product[]>`, `getPublicProduct(slug): Promise<Product | null>`.

- [ ] **Step 1: Test public row mapping and static fallback**

```ts
expect(mapCatalogRow(row)).toMatchObject({slug:"tom-ford-oud-wood-edp-50", volumeMl:50});
expect(await listPublicProducts({client:null})).toHaveLength(114);
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run src/data/catalog-service.test.ts`
Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement the service and loading states**

```ts
export async function listPublicProducts(): Promise<Product[]> {
  if (!supabase) return legacyProducts;
  const {data,error}=await supabase.from("public_catalog").select("*").order("brand");
  if (error) return legacyProducts;
  return data.map(mapCatalogRow);
}
```

- [ ] **Step 4: Verify catalog and direct product routes**

Run: `npm test -- --run src/data/catalog-service.test.ts src/pages/CatalogPage.test.tsx && npm run build`
Expected: PASS and a successful Vite build.

- [ ] **Step 5: Commit**

```bash
git add src/data src/hooks src/pages src/types
git commit -m "feat: load public catalog from Supabase"
```

### Task 6: Editorial enrichment queue

**Files:**
- Create: `scripts/catalog/enrich-products.ts`
- Create: `scripts/catalog/enrich-products.test.ts`
- Create: `src/components/FragranceNotes.tsx`
- Modify: `src/pages/ProductPage.tsx`

**Interfaces:**
- Produces: enrichment records with source URL, verified fields and confidence; never copies Telegram descriptions.

- [ ] **Step 1: Test complete and partial details**

```ts
expect(validateDetails(completeDetails)).toEqual({valid:true});
expect(validateDetails({...completeDetails, topNotes:[], heartNotes:[], baseNotes:[], keyNotes:[]})).toEqual({valid:false, reason:"missing_notes"});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- --run scripts/catalog/enrich-products.test.ts`
Expected: FAIL because validation is missing.

- [ ] **Step 3: Implement source priority, validation and product notes UI**

```ts
const sourcePriority = ["official_brand", "official_distributor", "major_catalog"] as const;
if (!details.sourceUrl.startsWith("https://")) return invalid("invalid_source");
if (![...details.topNotes,...details.heartNotes,...details.baseNotes,...details.keyNotes].length)
  return invalid("missing_notes");
```

- [ ] **Step 4: Verify no Telegram descriptions render**

Run: `npm test -- --run scripts/catalog/enrich-products.test.ts src/pages/ProductPage.test.tsx && npm run build`
Expected: PASS; product pages show editorial notes or a review-state message.

- [ ] **Step 5: Commit**

```bash
git add scripts/catalog src/components/FragranceNotes.tsx src/pages/ProductPage.tsx
git commit -m "feat: enrich fragrance cards with sourced details"
```

