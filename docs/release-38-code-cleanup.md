# Version 38 — behavior-preserving code cleanup

Baseline: published version 37, source `3326316d8190b43d2d5de9a4173a073c56166e7c`.

## Changes

- Centralized order-independent comparison pair keys in a small dependency-free module, reused by the builder, creation API, research imports, launch planning, and finder. The original discovery export remains compatible.
- Centralized public-site hostname checks for analytics and image paths. Caller-specific normalization and preview exclusion remain unchanged.
- Separated the finder's category-specific scoring adapter from aggregation and ranking, replacing ambiguous score variables with named values and reusable types.
- Replaced repeated comparison-product casts with explicit types and readable publication eligibility conditions.
- Expanded dense research, offer, category scoring, image, and analytics code into more readable blocks. Formatting-only edits were compared through the emitted JavaScript syntax tree before applying them.

## Preserved behavior

No changes to page layouts, public text, category models or weights, score thresholds, research fixtures, product data, database migrations, authentication rules, URLs, dependencies, or lockfiles. Visitor sign-in and saved comparisons remain absent.

## Validation

- Production build succeeded.
- All 79 existing regression tests passed, including actual built route rendering, voting, imports, published-comparison eligibility, and retailer offer handling.
- Finder output matched version 37 in 606 scenarios spanning all six categories, each preset, budget constraints, required features, invalid choices, and repeated/reversed pairs.
- The comparison can be repeated with `node scripts/check-finder-equivalence.mjs`; pass another baseline commit as its optional first argument.
- No new browser-based visual inspection was performed. Appearance is preserved by leaving layout markup and styling unchanged.

Prepared as an unpublished release candidate. Production remains on version 37 until approval.
