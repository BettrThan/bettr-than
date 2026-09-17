# QA stabilization release candidate

Status: prepared for saving; production remains on version 25 until publication is requested.

## Corrections

- Catalog comparison records now take precedence over legacy speaker slugs for voting. Withdrawing a catalog comparison cannot re-enable it via the legacy fallback.
- Extended-category scoring requires verified evidence whose value matches the current fact, with a valid HTTPS source and a non-future retrieval date. Malformed provenance is safely excluded.
- Product indexing and structured metadata use each category's schema and name. Extended-category comparison metadata uses the correct URL path.
- Selected score presets now drive their own recommendations, strengths and coverage explanations. Ineligible presets cannot present a numerical winner or misleading tie.
- Portable console scoring requires portable form factors plus display and battery evidence for both devices. Standalone VR scoring requires verified standalone operation and battery evidence for both.
- Category cards serve images directly. Cached optimizer URLs can safely return original local raster images when transformation is unavailable.
- Nine exact manufacturer product images are bundled, with source attribution in `data/research/product-image-repairs.json`. Image-only repairs do not modify approved research payloads, catalog facts, timestamps, or comparison data versions.
- Missing or failed product images show an explicit accessible fallback. Extended product pages now expose research/configuration notes and field-level source caveats.
- Homepage category tabs support arrow keys, Home and End with roving focus; empty states use the selected category's name. Count badges remain removed.

## Validation

- Production build passes.
- 63 automated checks pass, including the built request handler exercised against disposable SQLite: representative category/product/comparison routes, product indexing, all three legacy-colliding speaker matchups with actual feature/use-case vote submissions, withdrawn record behavior, and cached image fallback.
- Existing Headphones CSV import, comparison scoring, research approval/idempotency, commerce, analytics and vote-security tests pass.
- All 180 balanced pairs in the four extended categories remain eligible/current with unchanged approved inputs. No balanced weights or version identifiers were changed by this corrective patch.
- Browser: all six category images load, category switching works, arrow-key selection updates the correct panel, and empty states identify the correct category.
- Browser comparison testing remains limited by the isolated preview's empty catalog; representative data-backed rendering and voting are covered by the built-handler tests. No live votes or production catalog records were changed.
- Standalone `tsc --noEmit` remains limited by pre-existing missing Cloudflare runtime type declarations. Build and functional tests do not depend on this separate declaration setup. Do not call this a full type-check sign-off.

## Remaining imagery

No verified exact-model image was available for Pixel Watch 5 (41 mm), Garmin Venu 4 (45 mm), Lenovo Legion Go S (SteamOS), Samsung Galaxy XR, or Samsung Galaxy Ring. The UI explicitly labels unavailable imagery. Google gallery assets labeled Pixel Watch 4 were deliberately excluded from the Watch 5 record. Manufacturer research should revisit these five assets; no substitute models were used.

## Publication

No schema migration or research republishing is required. Publication of this code release will retain existing published products, comparisons, votes, retailer offers and research approval history. Once published, verify the affected public routes and image logs again to confirm the production rollout.
