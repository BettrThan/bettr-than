# Release 35 — Product finder and retailer offer setup

## Roadmap scope

Implements the next two roadmap areas: personalized purchasing decisions and affiliate offer operations. Saved for owner approval before publication. Partner enrollment, live API credentials, and commission activation are not claimed or simulated.

## Product finder

- `/find` supports all six approved categories, category-specific presets, maximum USD reference price, and conjunctive must-have features.
- Ranking uses only current published comparisons with approved evidence. It averages each product's eligible pair scores against its published opponents, then applies filters. Opponent counts and limitations are visible; these are relative specification scores, not lab ratings.
- A filter matches only a verified, value-matching fact with a dated HTTPS source. Missing facts do not satisfy requirements. Empty, invalid, and unavailable states are explicit.
- The top three matches link to product details and already-published comparisons. Filter URLs are shareable and noindex; the finder creates no products or comparisons.
- Headphone, phone, and extended-category preset selections use query parameters consistently. Phone guidance now follows the active preset. Preview choices remain local to the preview.
- Homepage and navigation expose the finder. Header controls wrap on narrow screens.

## Retailer offers

- Owner offer management now includes approved products from every category, plus counts for offer coverage, fresh affiliate offers, and stale approved prices.
- Downloadable CSV template includes approved product slugs. Upload previews validate up to 100 rows. Import revalidates server-side, skips invalid rows, and updates the existing product/retailer offer identity.
- Each saved offer and appended price observation commit together in a D1 batch. Existing products, voting, comparison scores, and schema are unchanged.
- Manual entries default to draft and unknown availability. Draft approval and disable/enable actions are visible. Existing offer relationships are edited from their own affiliate/sponsored flags.
- Future checked times, invalid USD amounts, unapproved product slugs, duplicate file entries, and unsafe destinations are rejected.
- Public offer cards show item-plus-shipping totals before tax when shipping is known, stale-price notices, per-link affiliate labels, and a disclosure before purchase links. Lowest-listed labels require at least two fresh in-stock offers in the same currency with known shipping.
- `/how-we-earn` explains commercial relationships, ranking independence, reference prices, and redirect counts.
- Redirects require an approved offer, enabled retailer, and published product; preserve the exact approved destination; use no-store; and record category and a verified associated comparison. Development/test hosts do not add click counts.

## Validation — 2026-09-15

- Production build passed on the final source.
- All 77 tests passed using `node --test --test-concurrency=1 tests/*.test.mjs`.
- Added built-worker tests run the real routes against isolated SQLite: owner access and origin checks, CSV preview without writes, six-category imports and repeat updates, price history, public cards, attribution, redirects, disabling, finder gates, budget/OS constraints, and query presets.
- `git diff --check` passed.
- Standalone TypeScript checking remains blocked by the pre-existing missing Cloudflare runtime declarations (`cloudflare:workers`, `Fetcher`, `D1Database`). Null-score prop errors in the touched comparison components were corrected; this is not a claim of a clean full typecheck.
- No browser visual QA or production catalog/offer mutations were performed in this iteration.

## Activation dependency

The owner must supply approved retailer/affiliate destination links and verified current prices through the offer manager or its CSV template. Automated provider refreshes additionally require an authorized provider account and credentials. No affiliate ID, approval, commission, real offer, or API connection was invented. The adapter boundary remains available for that integration.
