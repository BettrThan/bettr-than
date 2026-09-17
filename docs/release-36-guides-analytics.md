# Release 36: buying guides and measurement

Prepared as an unpublished release candidate after version 35.

## Changes

- Six original category buying guides with canonical metadata, sitemap entries, and category-specific product-finder links. The guidance explicitly does not claim hands-on testing.
- Category-level guide, finder, comparison, and retailer-click event reporting, plus retailer click totals over the last 30 days. Activity counts are not unique visitor counts or revenue.
- A public Guides link in the main navigation.

## Validation

- Production build and regression tests pass.
- Built-worker integration tests cover all six guides, canonical URLs, sitemap inclusion, and protected analytics.
- Existing comparison, CSV import, scoring, retailer offer, and voting regression checks pass.

## Boundaries

This release does not require visitors to sign in. It does not connect affiliate accounts, sales or commission reporting, email alerts, or Search Console. Clicks are not represented as purchases. Production has not been changed.
