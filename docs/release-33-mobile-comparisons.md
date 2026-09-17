# Release 33: consistent mobile comparison layout

Mobile and tablet comparison pages now preserve the desktop left/right product arrangement. Equal flexible columns, smaller card padding, bounded image panels, wrapping product names, and centered scores retain the comparison structure without forcing desktop dimensions onto a phone. The winner indicator uses the same horizontal direction at every width, with its wide opening facing the leader. Its accessible result label remains available when the redundant small-screen caption is hidden.

The comparison-page selector retains two product controls in one row on mobile with 16px input text and a full-width action. Home-page picker behavior is unchanged. Headphone factor rows retain left/right values together beneath each factor explanation, and preset score summaries remain side by side.

The six catalog categories and legacy speaker comparisons share the responsive rules. No scoring, catalog, voting, persistence, or publishing logic changed. Mobile and tablet sizing is scoped below the desktop breakpoint. Names and descriptions remain available without line clamping.

Validation: production build and the existing rendered-route and winner-indicator regression checks. No browser-based viewport or device testing was performed.
