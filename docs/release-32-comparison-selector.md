# Release 32: compare again from every comparison page

- Replaces large repeated matchup headings with a compact product selector on all six category comparison routes and legacy speaker routes.
- Prefills the current pair, remounts picker state when navigating to another pair, and reuses the existing searchable controls, duplicate exclusion, swap control, published-match links, and unavailable-match guidance.
- Keeps category-scoped published comparison eligibility checks. Existing loaded collections are reused; the headphone route loads its published category collection. Client props include only picker fields.
- Adds centered, preset-aware scores beneath smartphone and extended-category product cards and centers the existing headphone and legacy speaker scores.
- Reverses the animated symbol so the wide opening faces the higher-scoring product. Mobile orientation, ties, close-lead underline, invalid-evidence handling, and reduced-motion behavior remain supported.
- Removes repeated brand prefixes from selector labels; canonical product names appear directly.

Validation: production build passes. Focused request-handler and indicator checks cover all six categories, prefilled products on non-default pairs, current comparison links, legacy speaker pages, voting regressions, and symbol direction across researched pairs and scoring presets. Browser interaction testing was not requested or run. No migration or catalog mutation is required.
