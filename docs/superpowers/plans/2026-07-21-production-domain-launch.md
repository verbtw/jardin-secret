# Production Domain Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure production Supabase, secure server secrets, deploy the verified site to Vercel and connect the customer's domain with HTTPS.

**Architecture:** Production infrastructure is configured only after application tests and staging verification pass. Migrations run in order, secrets are added to server-only environments, the first import is audited, and domain DNS is switched last with the Vercel fallback domain retained.

**Tech Stack:** Supabase, Vercel, GitHub, Playwright/browser verification

## Global Constraints

- Never commit or expose EParfume credentials or Supabase service-role keys.
- Run migrations and the first catalog import before switching DNS.
- Registration is optional; catalog and Telegram ordering remain available when auth is unavailable.
- Production must use HTTPS and support direct SPA routes.
- Keep the existing Vercel alias available for rollback.

---

### Task 1: Full local verification

**Files:**
- Modify only files required by discovered test failures.

- [ ] **Step 1: Run unit and component tests**

Run: `npm test -- --run`
Expected: all tests pass.

- [ ] **Step 2: Run production build and secret scan**

Run: `npm run build && rg -n "EPARFUME_|SERVICE_ROLE|Amina005006" dist src . --glob '!node_modules/**' --glob '!.git/**'`
Expected: build succeeds and secret scan finds no credential values in tracked/application output.

- [ ] **Step 3: Run E2E on desktop and mobile**

Run: `npm run test:e2e`
Expected: guest catalog/order, optional registration and admin scenarios pass.

- [ ] **Step 4: Commit any targeted verification fixes**

Stage only the files named by `git status --short`, excluding `portfolio-images/`, then commit:

```bash
git commit -m "fix: resolve production verification issues"
```

### Task 2: Production Supabase configuration

**Files:**
- Use migrations under `supabase/migrations/`; no secret files.

- [ ] **Step 1: Create or select the dedicated Jardin Secret project**
- [ ] **Step 2: Apply migrations in timestamp order**
- [ ] **Step 3: Create the initial manager Auth user and insert its UUID into `admin_users`**
- [ ] **Step 4: Configure site URL and password-reset redirect URLs for Vercel and the final domain**
- [ ] **Step 5: Run Supabase security advisors and verify RLS on all private tables**

Expected: public catalog is readable; supplier/pricing/admin data is inaccessible to anon and ordinary authenticated users.

### Task 3: Vercel secrets, cron and first import

**Files:**
- No plaintext secret files.

- [ ] **Step 1: Add public frontend variables**

Set `VITE_SUPABASE_URL` and the publishable/anon key for Preview and Production.

- [ ] **Step 2: Add server-only variables**

Set `SUPABASE_SERVICE_ROLE_KEY`, `EPARFUME_EMAIL`, `EPARFUME_PASSWORD`, and `CRON_SECRET` only for protected server environments.

- [ ] **Step 3: Deploy a preview and invoke one authenticated dry-run sync**

Expected: importer reports counts without publishing review-state rows.

- [ ] **Step 4: Run the first production import and inspect anomalies**

Expected: only exact full-size fragrance variants are published; no supplier data appears in browser responses.

### Task 4: Production deploy and browser verification

**Files:**
- None unless verification finds a defect.

- [ ] **Step 1: Push the verified main branch to GitHub**
- [ ] **Step 2: Deploy Vercel production**
- [ ] **Step 3: Verify home, catalog, search, direct product URL, Telegram message, registration and admin access**
- [ ] **Step 4: Verify 375 px mobile and desktop layouts, console errors and broken images**
- [ ] **Step 5: Confirm cron status and latest successful import timestamp**

Expected: Vercel deployment is Ready and all critical user journeys succeed.

### Task 5: Domain connection and rollback check

**Files:**
- Vercel project/DNS configuration only.

- [ ] **Step 1: Add the exact customer-owned domain to the Vercel project**
- [ ] **Step 2: Apply the DNS records Vercel returns without changing unrelated mail records**
- [ ] **Step 3: Wait for certificate issuance and verify HTTPS**
- [ ] **Step 4: Set the canonical site URL in Supabase redirects and frontend metadata**
- [ ] **Step 5: Verify apex, `www`, direct SPA routes and Telegram links on the domain**
- [ ] **Step 6: Confirm the existing `jardin-secret-phi.vercel.app` alias still works for rollback**

Expected: the public domain serves the verified production deployment over HTTPS.
