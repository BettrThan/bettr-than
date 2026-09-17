# Release 34 — Comparison readability and reliability

## Scope

First delivery from the monetization-readiness roadmap's reliability work, including the requested visual changes. This does not complete the broader roadmap or claim that affiliate integrations, trust pages, or domain email are finished.

- Every category's specification table now reads: left product value, centered specification label, right product value. Legacy speaker comparisons use the same component.
- Column and row headers are associated for assistive technology. Narrow layouts retain all three columns, with wrapping values and labels.
- Headphone explanations remain available through “Why it matters”; source links and checked dates stay in the corresponding product's cell.
- “What matters to you?” headings and preset controls are centered across category experiences.
- Headphone and smartphone product cards reuse the catalog image component, including its bundled-image mapping and missing-image fallback.
- Owner analytics links resolve the comparison's actual category instead of always linking to Headphones.

## Validation — 2026-09-15

- Production build completed successfully.
- All 73 regression tests passed using `node --test --test-concurrency=1 tests/*.test.mjs` against the latest build.
- Built-page tests verify the left / specification / right header order, row-header semantics, and centered-priority hooks in all six category routes. Existing tests cover selectors, CSV research, publication gates, evidence handling, voting, offers, and winner direction.
- `git diff --check` passed.
- Browser preview homepage loaded successfully. A subsequent preview reload was rejected by the browser URL policy. No workaround was attempted. Comparison screenshots, mobile appearance, and interactive visual QA therefore remain unverified in this iteration.
- Disposable local preview fixtures were added solely for QA; no production catalog records or database schema were changed.

## Delivery

Prepared as an unpublished release candidate under the existing approval-before-publication workflow.
