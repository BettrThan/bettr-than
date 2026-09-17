# Release 2 — Decision experience

**Scope:** BT-006 through BT-009  
**Baseline:** Version 13 / Release 1

## Assumptions

- Evidence-constrained verdict drafting is deterministic until an approved model provider is available. This keeps generation auditable and prevents unsupported claims without introducing credentials or an external dependency.
- Existing published comparisons remain public for backward compatibility. New comparisons require an approved verdict before publication.
- Existing products and comparisons retain their current data. Release 2 adds verdict fields and an aggregate, non-personal discovery-demand counter.
- The public Headphones picker uses only published products and routes only to existing published comparisons.

## Affected routes

- `/` — live Headphones picker plus Travel, Office, and Value discovery.
- `/category/headphones` — use-case discovery and quality-gated featured matchups.
- `/compare/headphones/[comparison]` — Balanced score, preset scores, attribute explanations, approved editorial verdict, People’s Pick, coverage, sources, and freshness.
- `/admin/comparisons` — draft, edit, regenerate, preview, approve, or reject evidence-backed verdicts.
- `/api/admin/comparisons/[id]/verdict` — owner-only verdict workflow.
- `/api/discovery-interest` — aggregate demand capture for use-case paths with no qualifying matchup.

## Verdict safeguards

- Generation reads only owner-approved products and the versioned scoring output.
- Both products need at least one distinct approved advantage; otherwise generation stops with an insufficient-evidence response.
- Evidence references are stored with the draft.
- Product or scoring changes invalidate approval until regeneration.
- Editing an approved verdict returns it to draft status.
- New comparisons cannot publish until their verdict is approved.

## Featured-matchup rule

Featured comparisons are selected automatically from records that are:

1. published;
2. at least 70% complete across shared core Headphones facts; and
3. paired with an owner-approved current verdict.

Eligible comparisons are ordered by coverage and recency. Draft, incomplete, stale-verdict, and unpublished records never appear as featured discovery results.

## Known boundaries

- External model-powered drafting is deferred until an authorized provider and server-side credentials are available. The owner workflow and evidence contract are provider-ready.
- Protected multi-dimensional voting remains Release 3. Release 2 labels the existing overall community choice as People’s Pick without changing its behavior.

## Validation

- Production build: passes.
- Release 1 and Release 2 trust/decision tests: 10 of 10 pass.
- Full suite: 13 of 15 pass; the only failures are the two unchanged Version 12 harness failures documented in the Release 1 baseline.
- Migration review: one bounded aggregate-demand table plus additive, constant-default or nullable verdict fields. Existing records remain intact.
- Responsive behavior is encoded for phone, tablet, and desktop breakpoints; interactive controls have keyboard focus and explicit accessible labels. Browser-driven visual QA was not requested for this release.
