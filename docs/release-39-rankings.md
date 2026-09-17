# Version 39 — category rankings

Adds `/rankings` and a Rankings link in the main navigation.

Visitors select one of the six existing categories. Each ranked row shows only rank, product image, name, and score out of 100. Results use the existing finder's average Balanced comparison score, ordered highest first, limited to ten eligible published products. There is no priority selector or new scoring model.

Category selections have shareable URLs and category-specific canonical metadata. Invalid categories fall back to Headphones. Missing eligible comparisons produce an honest empty state; database errors have a recoverable message. Existing tie ordering (opponent count, then product name) is retained and explained.

Validation: production build passed. All 17 built-worker integration tests passed, including ordered product IDs, scores, images and ranks for ten products in every category, navigation, invalid-category fallback, exclusion of unpublished comparisons, and absence of priority controls. Existing comparison, voting, offer, guide and finder integration checks also passed. No new browser visual inspection was performed.

No database migration, dependency change, product-data update, or production deployment is included. Prepared as an unpublished release candidate.
