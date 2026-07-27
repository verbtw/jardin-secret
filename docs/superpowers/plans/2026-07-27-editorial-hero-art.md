# Editorial Hero Artwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synthetic Jardin Secret bottle illustration with a responsive editorial perfume still life that contains no fake branding.

**Architecture:** Generate one local portrait-oriented hero asset, store it as an optimized WebP, and render it through a semantic `hero__media` wrapper. A dedicated `hero-art.css` override owns framing and responsive behavior while the existing hero copy and page structure stay unchanged.

**Tech Stack:** React 19, TypeScript, CSS, WebP, Vitest, Testing Library, Playwright, Vite.

## Global Constraints

- Keep the existing hero copy, actions, background, and two-column structure.
- Use no readable product logos, labels, invented brand marks, text, or watermark in the image.
- The image is decorative with `alt=""` and an `aria-hidden` wrapper.
- Preserve layouts at 1440 × 1000 and 390 × 844 without horizontal overflow.
- Preserve a gradient fallback when the image cannot load.

---

### Task 1: Generate and integrate the editorial hero

**Files:**
- Create: `public/hero/editorial-perfume.webp`
- Create: `src/components/Hero.test.tsx`
- Create: `src/hero-art.css`
- Modify: `src/components/Hero.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: the local asset path `/hero/editorial-perfume.webp`.
- Produces: `.hero__media` containing a decorative `.hero__photo` image.

- [ ] **Step 1: Write the failing component test**

```tsx
it('uses the editorial hero image without the old branded bottle markup', () => {
  render(<MemoryRouter><Hero /></MemoryRouter>);
  expect(screen.getByTestId('hero-media')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('presentation')).toHaveAttribute('src', '/hero/editorial-perfume.webp');
  expect(document.querySelector('.perfume-bottle')).not.toBeInTheDocument();
  expect(document.querySelector('.glass-orb')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- --run src/components/Hero.test.tsx`

Expected: FAIL because the new media container and image do not exist.

- [ ] **Step 3: Generate the source image**

Use the built-in image generator with this production prompt:

```text
Use case: ads-marketing
Asset type: right-side ecommerce homepage hero artwork, portrait composition
Primary request: a premium editorial still life for an original niche perfume boutique
Subject: three distinct elegant unbranded glass perfume bottles on pale limestone and frosted glass plinths, with restrained living green branches
Style/medium: high-end realistic product photography, refined magazine campaign, not a 3D mockup
Composition/framing: vertical 4:5, main bottles centered with generous breathing room, complete bottle silhouettes visible, designed to crop safely on mobile
Lighting/mood: soft diffused daylight, translucent reflections, quiet luxurious mood
Color palette: milk white, transparent glass, smoky sage, deep pine green, tiny warm highlights
Constraints: no readable logos, no labels, no text, no watermark, no hands, no people, no retail boxes
Avoid: fake brand identity, floating objects, excessive flowers, hard black background, oversaturated colors
```

Inspect the generated result, keep the strongest variant, and save the final project asset at exactly `public/hero/editorial-perfume.webp`.

- [ ] **Step 4: Implement the new hero markup**

```tsx
<div className="hero__art" aria-hidden="true" data-testid="hero-media">
  <div className="hero__media">
    <img className="hero__photo" src="/hero/editorial-perfume.webp" alt="" role="presentation" />
  </div>
</div>
```

Delete the `.glass-orb`, `.orb-light`, `.perfume-cap`, `.perfume-bottle`, and `.botanical` nodes from `Hero.tsx`.

- [ ] **Step 5: Add responsive framing**

Create `hero-art.css` with a portrait frame, `object-fit: cover`, a subtle border, soft shadow, gradient fallback, edge mask, and a restrained entrance animation. At `max-width: 980px`, use a wider frame and keep its height below 500px. At `max-width: 600px`, use a 330px frame with safe centered cropping. In reduced-motion mode, disable the animation.

- [ ] **Step 6: Verify focused behavior**

Run: `npm test -- --run src/components/Hero.test.tsx src/pages/HomePage.test.tsx`

Expected: both test files pass.

- [ ] **Step 7: Verify the entire application**

Run: `npm test -- --run && npm run build && npm run test:e2e`

Expected: all unit tests, production build, and desktop/mobile storefront scenarios pass.

- [ ] **Step 8: Browser QA and commit**

Check the homepage at 1440 × 1000 and 390 × 844. Confirm the bottles remain visible, the copy is unobstructed, no image is broken, and no horizontal scrolling appears.

```bash
git add public/hero/editorial-perfume.webp src/components/Hero.test.tsx src/components/Hero.tsx src/hero-art.css src/main.tsx
git commit -m "feat: add editorial perfume hero"
```
