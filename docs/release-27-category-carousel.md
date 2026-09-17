# Homepage category carousel

Replaces the six-button comparison category grid with one horizontally scrolling icon row in the existing Bettr Than palette.

- Native touch and trackpad scrolling with center snapping, including the first and last categories.
- Tapping a category centers it and updates the comparison picker; scrolling updates the selection when movement settles.
- Previous/next controls, arrow-key navigation, Home/End, roving keyboard focus, and linked tab panels.
- Reduced-motion support; changes scroll the row without moving the page vertically.
- Selected category emphasis, edge fades and unobtrusive position indicators. No category count badges.
- Existing category data, comparisons and approval workflows are preserved. No new dependencies or migrations.

Validation: production build and existing built-handler rendering tests. Interactive browser testing was not performed for this change.

Saved as an unpublished release candidate; publication is a separate user request.
