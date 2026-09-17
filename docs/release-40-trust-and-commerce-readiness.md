# Version 40 — scoring transparency and commerce readiness

Continues the trust and affiliate-activation areas of the monetization roadmap after version 39.

## Delivered

- Public `/how-we-score` explains the actual Headphones winner/tie weighting versus proportional numeric scoring in other categories, evidence exclusions, relative scores, Balanced rankings, and commercial independence.
- Category weight tables and scoring versions come directly from existing model definitions. Scoring behavior is unchanged.
- Comparison selectors and rankings link to methodology. Sitemap includes the methodology page and six canonical category-ranking URLs.
- Owner-only `/admin/readiness` summarizes approved products, current eligible comparisons, possible pairings, fresh retailer coverage, and fresh affiliate-offer coverage across all six categories.
- Product-level gaps identify missing current comparisons, missing fresh in-stock offers, and stale public offers. The dashboard links to existing offer and research tools; the offer manager links back to readiness.
- Dashboard uses the existing public-offer filter, excludes stale and out-of-stock offers from fresh coverage, and distinguishes database failures from zero coverage. It reads data without publishing or changing records.

## Validation

Production build passed. All 18 built-worker integration tests passed, including public methodology, category metadata and sitemap links, anonymous/non-owner denial, private noindex, six-category readiness, 45-pair coverage, stale and out-of-stock exclusions, and zero-product handling. Existing ranking, comparison, voting, import, guide and offer integration checks remain passing. No browser visual inspection was performed.

## Roadmap state

| Area | Delivered | Still dependent on follow-through |
| --- | --- | --- |
| Trustworthy shopping experience | Comparison QA, mobile layout, source gates, public methodology | Ongoing review of manufacturer evidence and catalog freshness |
| Personalized buying decisions | Finder, category presets, Balanced rankings | Validate usefulness through real visitor activity |
| Affiliate purchasing | Offer editor, CSV import, disclosures, redirects, readiness gaps | Actual partner enrollment, authorized links and verified offers; provider credentials for automated refresh |
| Original content | Six category buying guides and public methodology | Expand with evidence-backed editorial content |
| Measurement | Category events and retailer-click dashboard | Authorized sale/commission reporting; clicks alone are not revenue |

Visitor accounts and saved comparisons remain excluded at the owner's request. This update does not enroll in affiliate programs, send messages, configure provider credentials, or claim that affiliate relationships are approved. Prepared as an unpublished candidate; production is unchanged.
