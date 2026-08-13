# Footer Credit and Gender Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the linked developer credit and supply accurate gender data to the existing catalog filters.

**Architecture:** Preserve the React filter API and fix its upstream data contract. A constrained Postgres column flows through the public view, enrichment repository, public catalog mapper, and existing `Product` model.

**Tech Stack:** React, TypeScript, Vitest, Supabase Postgres, Vite, Playwright.

## Global Constraints

- The developer link is exactly `https://t.me/verbtwdev`.
- Gender values are limited to `women`, `men`, `unisex`, and `unknown`.
- Unmatched products stay `unknown`; they are never silently included in a specific gender.
- The public view remains `security_invoker` and existing RLS remains enabled.

---

### Task 1: Footer credit

**Files:** `src/components/Layout.tsx`, `src/pages/HomePage.test.tsx`

- [ ] Assert a `Developed by @verbtwdev` link to Telegram and the absence of the old credit.
- [ ] Run the focused test and confirm it fails.
- [ ] Implement the footer markup and confirm the test passes.

### Task 2: Gender data contract

**Files:** `scripts/catalog/gender.ts`, `scripts/catalog/open-perfume-dataset.ts`, `scripts/catalog/enrich-products.ts`, `scripts/catalog/run-enrichment.ts`, `src/data/catalog-service.ts`, their tests.

- [ ] Add failing tests for Female, Male, Unisex, unknown and remote mapping.
- [ ] Implement one normalization function and carry its result through enrichment.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Persistence and migration

**Files:** `scripts/catalog/postgres-enrichment-repository.ts`, its test, and a new Supabase migration.

- [ ] Add failing SQL-fragment assertions for persisting gender.
- [ ] Update single and batched profile persistence.
- [ ] Create a migration that adds the constrained column, recreates the security-invoker view, and grants column access.
- [ ] Apply and verify the migration in production.

### Task 4: Existing catalog backfill

**Files:** `scripts/catalog/run-gender-backfill.ts` and focused tests.

- [ ] Match unknown database profiles against the open perfume dataset.
- [ ] Update matches in safe batches and leave unmatched rows unknown.
- [ ] Run the backfill and verify aggregate production counts.

### Task 5: Verification and release

**Files:** no additional production files.

- [ ] Run the full Vitest suite, production build, and Playwright E2E suite.
- [ ] Verify footer and all gender filter counts on desktop and mobile.
- [ ] Commit, push, merge through a PR, deploy to Vercel, and recheck the public alias.
