# Combined launch update

## Scope

Includes the previously saved commerce, analytics and SEO work, plus curated Headphones launch ordering/readiness, related comparisons, ten researched Smartphones, 45 smartphone comparisons, and automatic research batches with an explicit publication decision. The initial smartphone publication was approved with the request to publish the newest version. Future weekly batches remain pending approval.

## Validation

- 34 focused tests pass for Headphones import, batch comparisons, provenance, scoring, voting protection, commerce, analytics, SEO and research publication.
- Additional migration integration test passes: 10 smartphones and 45 approved comparisons, no orphan pairs, replay safe, existing headphone records and votes preserved.
- Research upload and publication tested through production Drizzle queries using a local SQLite D1 adapter: upload leaves public data unchanged; digest mismatch and stale updates fail; publication preserves existing URLs and is repeat-safe.
- Lint: zero errors; six direct-image warnings. Direct image delivery preserves the earlier image optimization fix.
- Internal browser: ten phones/45 links displayed, comparison navigation works, actual product images load, Value preset changes scores, alternate product selection resolves the expected canonical comparison URL, and swapping keeps one canonical pair.
- The local preview has no production voting secret or signed-in owner session. Live voting and owner publication were not exercised through that browser; authentication is unchanged and the query/publication paths have integration coverage.
- Two previously documented starter harness limitations remain: Node cannot directly import cloudflare Worker modules in rendered-html.test.mjs; ui-components.test.mjs expects obsolete CSS utility output. See release-1-baseline.md. These tests were not weakened.

## Data and rollback

New tables and indexes are additive. The initial smartphone seed inserts only new records and never edits headphone records or votes. Research updates preserve record identities and URLs; publication checks a stored baseline inside its transaction to avoid overwriting newer owner edits. An application rollback does not remove newly published data or additive tables.

Smartphone comparisons explicitly describe their limited specification model. Missing manufacturer figures remain unknown. Launch MSRP is labeled as a reference price, and chipset, camera megapixels and battery capacity are not treated as performance measurements.

## Weekly workflow

See WEEKLY-RESEARCH.md. The scheduled research agent saves an unpublished candidate each Monday morning. It does not publish autonomously.
