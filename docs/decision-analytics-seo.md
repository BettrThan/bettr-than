# Decision analytics and indexing contract

## Stable decision events

The browser records only these allowlisted events:

- `picker_started`
- `picker_completed`
- `comparison_viewed`
- `preset_changed`
- `vote_completed`
- `retailer_clicked`
- `comparison_zero_results`
- `matchup_unavailable`

Events may contain a random session-scoped journey ID, a category slug, a comparison slug, up to two product IDs, a scoring preset, and a small allowlist of categorical metadata. They never store an IP address, email address, user-agent string, or free-form visitor content. Only same-origin requests on `bettrthan.com` or `www.bettrthan.com` are persisted, so development, previews, and automated tests are excluded.

The owner dashboard reports a 30-day funnel and the most-viewed comparisons.

## Indexing rules

- Every indexable collection, product, and comparison declares one canonical URL.
- Headphones product pages require published status, an HTTPS source, and at least three normalized specifications before indexing.
- Headphones comparisons require current eligible data and an owner-approved verdict before indexing.
- Draft, thin, upcoming-category, admin, API, and query-state pages are excluded from the sitemap or marked `noindex`.
- Structured data describes only facts present on the page. It does not invent ratings, reviews, prices, or availability.
- Reversed product selections resolve to the one stored canonical comparison slug.
