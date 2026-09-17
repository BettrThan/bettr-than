import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true } });
after(async () => vite.close());

const { parseProductCsv } = await vite.ssrLoadModule("/lib/csv-product-import.ts");
const { getHeadphonePairCoverageForProducts, getHeadphoneProductReadiness, sanitizeProductSpecProvenance, scoreHeadphoneComparison } = await vite.ssrLoadModule("/lib/headphone-specs.ts");
const { getHeadphoneComparisonEligibility } = await vite.ssrLoadModule("/lib/comparison-workflow.ts");
const { isCurrentPublicComparison } = await vite.ssrLoadModule("/lib/comparison-discovery.ts");
const { comparisonDataVersion, draftComparisonVerdict } = await vite.ssrLoadModule("/lib/verdicts.ts");
const { buildComparisonCandidates, selectComparisonDraftCandidates } = await vite.ssrLoadModule("/lib/comparison-batch.ts");

const csv = await readFile(new URL("./fixtures/top-10-headphones.csv", import.meta.url), "utf8");
const rows = parseProductCsv(csv);
const retrievedAt = "2026-09-05T00:00:00Z";
const products = rows.map((row, index) => ({
  id: `product-${index + 1}`,
  slug: row.canonicalName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  canonicalName: row.canonicalName,
  brand: row.brand,
  sourceUrl: row.sourceUrl,
  imageUrl: row.imageUrl || null,
  description: row.description || null,
  status: "published",
  specsJson: JSON.stringify(row.specs),
  specProvenanceJson: JSON.stringify(sanitizeProductSpecProvenance({}, row.specs, { sourceUrl: row.sourceUrl, retrievedAt, sourceType: "manufacturer" })),
  updatedAt: retrievedAt,
}));

test("accepts the complete researched top-10 CSV", () => {
  assert.equal(rows.length, 10);
  assert.deepEqual(rows.flatMap((row) => row.errors.map((error) => `${row.canonicalName}: ${error}`)), []);
  assert.ok(rows.every((row) => row.specCount >= 11));
});

test("scores and drafts verdicts for every top-10 pairing", () => {
  const comparisons = [];
  for (let left = 0; left < products.length; left += 1) {
    for (let right = left + 1; right < products.length; right += 1) {
      const eligibility = getHeadphoneComparisonEligibility(products[left], products[right]);
      const score = scoreHeadphoneComparison(products[left], products[right]);
      const verdict = draftComparisonVerdict(products[left], products[right]);
      comparisons.push({ eligibility, score, verdict });
    }
  }
  assert.equal(comparisons.length, 45);
  assert.ok(comparisons.every(({ eligibility }) => eligibility.eligible));
  assert.ok(comparisons.every(({ score }) => score.availableWeight > 0 && score.scoreLeft + score.scoreRight === 100));
  assert.ok(comparisons.every(({ verdict }) => verdict.draft && verdict.draft.evidence.length >= 2));
  assert.ok(comparisons.slice(0, 20).every(({ verdict }) => verdict.draft));
});

test("selects twenty eligible unpublished comparison drafts", () => {
  const selected = selectComparisonDraftCandidates(products, [], 20);
  assert.equal(selected.length, 20);
  assert.ok(selected.every(({ coverage, verdict }) => coverage.eligible && verdict.evidence.length >= 2));
  assert.equal(new Set(selected.map(({ left, right }) => [left.id, right.id].sort().join(":"))).size, 20);
});

test("builds every eligible pairing for a full-library publish", () => {
  const selected = buildComparisonCandidates(products);
  assert.equal(selected.length, 45);
  assert.equal(new Set(selected.map(({ left, right }) => [left.id, right.id].sort().join(":"))).size, 45);
  assert.ok(selected.every(({ coverage, verdict }) => coverage.eligible && verdict.evidence.length >= 2));
});

test("uses verified provenance consistently for readiness and pair coverage", () => {
  const product = products[0];
  const provenance = JSON.parse(product.specProvenanceJson);
  for (const entry of Object.values(provenance)) entry.status = "needs_review";
  const unverified = { ...product, specProvenanceJson: JSON.stringify(provenance) };
  assert.equal(getHeadphoneProductReadiness(unverified).coreCoveragePercent, 0);
  assert.equal(getHeadphonePairCoverageForProducts(unverified, products[1]).coreCoveragePercent, 0);
});

test("publishes only a current approved comparison", () => {
  const left = products[0];
  const right = products[1];
  const current = { status: "published", verdictStatus: "approved", verdictScoringVersion: "headphones-v2.0.0", verdictDataVersion: comparisonDataVersion(left, right) };
  assert.equal(isCurrentPublicComparison(current, left, right), true);
  assert.equal(isCurrentPublicComparison({ ...current, verdictDataVersion: "stale" }, left, right), false);
  assert.equal(isCurrentPublicComparison({ ...current, verdictStatus: "draft" }, left, right), false);
});
