# Footer Credit and Gender Filter Design

## Goal

Replace the creator credit with a Telegram-linked `Developed by @verbtwdev` label and make catalog gender filters work across the full supplier catalog.

## Root cause

The filter comparison is correct, but gender data is not. The local snapshot contains 108 `unknown` values out of 114 products, and the Supabase mapper hard-codes every remote product to `unknown`. The enrichment dataset already exposes gender but the parser discards it, while the database has no gender column.

## Design

- Render `Developed by @verbtwdev` in the footer; only `@verbtwdev` is a link to `https://t.me/verbtwdev` and opens in a new tab.
- Add a constrained `gender` column to `public.products` with `unknown` as a safe default.
- Expose `gender` through the security-invoker `public_catalog` view and grant the existing public roles column access.
- Normalize dataset values to `women`, `men`, `unisex`, or `unknown` in one shared function.
- Carry gender through enrichment and the storefront mapper rather than guessing in the filter.
- Backfill existing published products from the same perfume dataset; unmatched products remain `unknown` and do not appear in a specific gender filter.
- Keep the filter labels and URL query format unchanged.

## Verification

Tests cover the footer link, gender normalization, dataset parsing, persistence, remote catalog mapping, and filtering. Database verification compares gender counts before and after the backfill. Desktop and mobile browser checks verify the public site.
