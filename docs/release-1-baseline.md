# Release 1 baseline audit

**Audited:** September 4, 2026  
**Source baseline:** Version 12 (`f4fed20`)  
**Scope:** BT-001 through BT-005

## Architecture

- Vinext/Next-style React application deployed as a Cloudflare Worker.
- Cloudflare D1 binding `DB` accessed through Drizzle.
- Dispatch-owned ChatGPT sign-in protects owner pages; server-side email or user-ID allowlisting authorizes the owner.
- Public catalog, category, product, comparison, and voting routes remain anonymous-compatible.
- Product ingestion supports approved manufacturer URLs, bounded extraction, manual editing, review, and bulk CSV import.
- Headphones use a 16-field JSON specification record.
- Comparisons and votes are durable D1 records.

## Critical routes

### Public

- `/`
- `/categories`
- `/catalog` and `/catalog/[slug]`
- `/category/headphones`
- `/compare/headphones/[comparison]`
- `/api/votes/[comparison]`

### Owner-only

- `/admin/ingestion`
- `/admin/comparisons`
- `/api/admin/ingestion/**`
- `/api/admin/comparisons`

## Version 12 data model

- `ingestion_jobs`: extraction and review workflow, normalized facts, editable Headphones specs, errors, and review notes.
- `catalog_products`: owner-approved products, source, facts, Headphones specs, and public metadata.
- `comparisons`: unique product pairs with a simple status and verdict field.
- `votes`: one editable overall vote per browser-supplied visitor ID and comparison.

## Baseline validation

- Production build: passes.
- Lint: 0 errors, 6 warnings.
- Tests: 3 pass, 2 pre-existing failures.

### Pre-existing failures

1. `rendered-html.test.mjs` imports the Worker through Node, which cannot resolve the `cloudflare:` module URL.
2. `ui-components.test.mjs` expects scrollbar utilities that are no longer emitted by the generated CSS.

These failures predate Release 1. They are preserved and documented rather than hidden or weakened.

## Release 1 gap analysis

- Field definitions do not yet declare core status, applicability, canonical unit, complete comparison behavior, or preset weights.
- Unit conversion is limited to extracted weight facts rather than centralized at the contract boundary.
- `specs_json` lacks durable field-level source, freshness, verification, and conflict metadata.
- Scoring has one balanced weight set, no configuration version, and no meaningful-difference threshold.
- Comparisons publish immediately and accept any nonzero shared scoring coverage.
- Public catalog queries do not explicitly enforce product publication state.

## Release 1 migration strategy

- Keep `specs_json` and all existing records intact for backward compatibility.
- Add provenance/conflict JSON alongside the existing specification values.
- Treat existing published catalog specifications as legacy owner-approved facts until edited; all new or edited facts receive explicit provenance.
- Add product publication state with a constant `published` default so existing public products remain public.
- Add comparison coverage, scoring-version, eligibility, and approval metadata while preserving existing published comparisons.
- New comparisons begin as drafts and require explicit owner review, approval, and publication.

## Release 1 validation

- Production build: passes.
- Release 1 trust, normalization, scoring, eligibility, and workflow tests: 8 of 8 pass.
- Full suite: 11 of 13 pass; the only failures are the two unchanged Version 12 harness failures documented above.
- Lint: 0 errors and the same 6 Version 12 warnings.
- Generated migration review: additive columns and indexes only; existing products and comparisons retain their published state through constant defaults.
