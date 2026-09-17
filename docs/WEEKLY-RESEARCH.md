# Weekly product research

The scheduled research task runs Monday mornings in America/Los_Angeles, starting September 14, 2026. It researches Headphones, Smartphones, Portable Speakers, VR Headsets, Wearables, and Game Consoles & Handhelds using primary manufacturer sources, checks the current production catalog, and prepares a new batch without asking for individual product review. Public publication always requires an explicit owner decision.

## Automated preparation

1. Read the Sites building/hosting instructions and this repository’s current state. Preserve unpublished feature work.
2. Inspect live catalog records read-only through Sites; preserve model, region and configuration identity. Research manufacturer sources freshly. Never bypass blocked sources. Unknown facts stay absent, and power-adapter ratings are not charging-intake measurements.
3. Create a new immutable, dated JSON batch in `data/research/`, following `lib/research-contract.ts`. Every specification needs a manufacturer URL and retrieval date. State the compared region/configuration and label launch MSRP separately from live offers.
4. Validate with `validateResearchBatch`, generate preview comparisons with `researchComparisons`, run the relevant tests, and register the batch in `lib/bundled-research.ts`.
5. Push the source and save an UNPUBLISHED Site candidate with the Sites workflow. This is the durable upload path for the scheduled agent; it does not require a private browser session or persistent API credentials. Report products, comparisons, conflicts, missing fields and the publication decision needed.
6. Do not deploy, mutate the live catalog, approve a batch, or generate an approved data migration unless the owner explicitly authorizes that specific publication. Do not create duplicate scheduled tasks.

## Publication

After the owner approves a release, deploy the corresponding saved Site version. New bundles automatically upload as pending records when the owner opens `/admin/research`; no individual product review is required. The console offers one explicit **Approve & publish batch** action, an evidence preview, rejection, and download. The owner can also approve both the release and a named data batch in conversation; in that case the owning agent can prepare a scoped data migration before deployment, as with the initial smartphone launch.

The upload API is owner-authenticated and requires the existing same-origin request protections. Uploading never publishes. Each batch is immutable and has a digest and catalog revision baseline. Publication uses a single SQLite/D1 transaction, preserves existing identities, comparison URLs, votes and nonmissing facts, blocks stale updates, and cannot republish a rejected batch. Unverified or insufficient comparisons stay out of public discovery.

## Initial smartphone release

The owner requested **Publish the newest version** after the ten-phone research and 45 comparisons were prepared. Migration `0010_approved_smartphone_launch.sql` activates only that initial batch. It does not update headphone records or votes. It is a one-time approved release, not permission for future automatic publication.

## Research scope

The initial lineup contains iPhone 17, 17 Pro, 17 Pro Max, iPhone Air, Galaxy S26, S26+, S26 Ultra, Pixel 10, Pixel 10 Pro and Pixel 10 Pro XL. It is an initial curated catalog, not a claim to rank every currently available phone. Reference prices in this batch are manufacturer launch MSRP. Smartphone scores compare sourced price, weight, storage, refresh rate and wireless charging; they do not infer camera quality from megapixels, endurance from capacity, or speed from chipset branding.
