# Capitalized Luxury Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capitalize the Jardin Secret identity and product typography, then replace empty-looking hero bottles with a filled luxury perfume still life.

**Architecture:** Keep the existing React and CSS structure. Change only the shared wordmark asset, capitalization rule, hero image reference and hero bitmap asset.

**Tech Stack:** React, TypeScript, CSS, Vitest, Vite, WebP.

## Global Constraints

- Preserve existing layout and responsive behavior.
- Use no third-party branding, labels, text or watermarks in the hero artwork.
- Apply visual Title Case without rewriting product data.

---

### Task 1: Lock the corrected presentation with tests

**Files:**
- Modify: `src/components/BrandLogo.test.tsx`
- Modify: `src/components/ProductCard.test.tsx`
- Modify: `src/components/Hero.test.tsx`

- [ ] Write assertions for `Jardin`, `Secret`, `text-transform: capitalize` and `/hero/luxury-filled-perfume.webp`.
- [ ] Run `npm test -- --run src/components/BrandLogo.test.tsx src/components/ProductCard.test.tsx src/components/Hero.test.tsx` and confirm failures describe the old presentation.

### Task 2: Implement the visual correction

**Files:**
- Modify: `public/brand/jardin-secret-wordmark.svg`
- Modify: `src/brand-identity.css`
- Modify: `src/components/Hero.tsx`
- Create: `public/hero/luxury-filled-perfume.webp`

- [ ] Capitalize both SVG words and update its accessible title.
- [ ] Change the shared product typography rule to `text-transform: capitalize`.
- [ ] Point Hero at the new filled-bottle artwork.
- [ ] Generate and add the optimized WebP hero asset.
- [ ] Run focused tests and confirm they pass.

### Task 3: Verify and publish

**Files:**
- No production files beyond Tasks 1–2.

- [ ] Run the production build and relevant automated tests.
- [ ] Inspect desktop and mobile rendering for image loading, capitalization and overflow.
- [ ] Commit, push, open a pull request, merge and deploy to production.
- [ ] Recheck the public Vercel URL after deployment.
