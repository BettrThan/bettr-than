import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const specsModule = await vite.ssrLoadModule("/lib/headphone-specs.ts");
const workflowModule = await vite.ssrLoadModule("/lib/comparison-workflow.ts");
const verdictModule = await vite.ssrLoadModule("/lib/verdicts.ts");
const discoveryModule = await vite.ssrLoadModule("/lib/comparison-discovery.ts");

const {
  HEADPHONE_SCORING_VERSION,
  NOT_APPLICABLE,
  headphoneFields,
  getHeadphonePairCoverage,
  normalizeHeadphoneSpecValue,
  sanitizeProductSpecProvenance,
  scoreHeadphoneComparison,
} = specsModule;

const { canTransitionComparison, getHeadphoneComparisonEligibility } = workflowModule;
const { comparisonDataVersion, draftComparisonVerdict } = verdictModule;
const { comparisonPairKey, isFeaturedComparison } = discoveryModule;

function product(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    slug: "example-headphones",
    canonicalName: "Example Headphones",
    brand: "Example",
    sourceUrl: "https://example.com/headphones",
    imageUrl: null,
    description: null,
    status: "published",
    specsJson: "{}",
    specProvenanceJson: "{}",
    ...overrides,
  };
}

test("declares a complete, versioned contract for every Headphones field", () => {
  assert.match(HEADPHONE_SCORING_VERSION, /^headphones-v\d+\.\d+\.\d+$/);
  assert.equal(headphoneFields.length, 16);
  for (const field of headphoneFields) {
    assert.ok(field.applicability);
    assert.ok(field.comparisonRule);
    assert.equal(typeof field.core, "boolean");
    assert.equal(typeof field.scorable, "boolean");
    assert.deepEqual(Object.keys(field.presetWeights).sort(), ["balanced", "office", "travel", "value"]);
  }
});

test("normalizes supported units at the contract boundary", () => {
  assert.equal(normalizeHeadphoneSpecValue("weight_grams", "1 lb"), "453.592");
  assert.equal(normalizeHeadphoneSpecValue("weight_grams", "0.25 kg"), "250");
  assert.equal(normalizeHeadphoneSpecValue("battery_life_hours", "90 minutes"), "1.5");
  assert.equal(normalizeHeadphoneSpecValue("price_usd", "$349.99"), "349.99");
});

test("keeps missing and not-applicable values distinct", () => {
  assert.equal(normalizeHeadphoneSpecValue("usb_c_audio", "n/a"), NOT_APPLICABLE);
  assert.equal(normalizeHeadphoneSpecValue("usb_c_audio", ""), undefined);
});

test("stores field-level provenance without internal notes leaking into scores", () => {
  const specs = { price_usd: "349", weight_grams: "250" };
  const provenance = sanitizeProductSpecProvenance({}, specs, {
    sourceUrl: "https://example.com/specifications",
    sourceType: "manufacturer",
    retrievedAt: "2026-09-04T00:00:00.000Z",
  });
  assert.equal(provenance.price_usd.sourceType, "manufacturer");
  assert.equal(provenance.weight_grams.unit, "grams");
  assert.equal(provenance.price_usd.status, "verified");
});

test("excludes unverified, missing, and not-applicable facts from scoring", () => {
  const left = product({
    slug: "left",
    canonicalName: "Left",
    specsJson: JSON.stringify({ price_usd: "300", weight_grams: "250", usb_c_audio: NOT_APPLICABLE }),
    specProvenanceJson: JSON.stringify({
      price_usd: { sourceUrl: "https://example.com/left", sourceType: "manufacturer", retrievedAt: "2026-09-04", confidence: 1, status: "needs_review", rawValue: "300", normalizedValue: "300", unit: "USD", notes: "private" },
      weight_grams: { sourceUrl: "https://example.com/left", sourceType: "manufacturer", retrievedAt: "2026-09-04", confidence: 1, status: "verified", rawValue: "250", normalizedValue: "250", unit: "grams", notes: null },
    }),
  });
  const right = product({ slug: "right", canonicalName: "Right", specsJson: JSON.stringify({ price_usd: "400", weight_grams: "260", usb_c_audio: "yes" }) });
  const result = scoreHeadphoneComparison(left, right, "balanced");
  assert.equal(result.factors.find((factor) => factor.key === "price_usd").state, "missing");
  assert.equal(result.factors.find((factor) => factor.key === "usb_c_audio").state, "not_applicable");
  assert.equal(result.factors.find((factor) => factor.key === "weight_grams").winner, "left");
});

test("uses preset-specific weights and treats trivial numeric differences as ties", () => {
  const left = product({ slug: "left", canonicalName: "Left", specsJson: JSON.stringify({ price_usd: "300", weight_grams: "250" }) });
  const right = product({ slug: "right", canonicalName: "Right", specsJson: JSON.stringify({ price_usd: "303", weight_grams: "300" }) });
  const balanced = scoreHeadphoneComparison(left, right, "balanced");
  const travel = scoreHeadphoneComparison(left, right, "travel");
  assert.equal(balanced.factors.find((factor) => factor.key === "price_usd").state, "tie");
  assert.notEqual(balanced.scoreLeft, travel.scoreLeft);
  assert.equal(balanced.scoringVersion, HEADPHONE_SCORING_VERSION);
});

test("requires 70 percent shared core coverage for publication", () => {
  const common = {
    price_usd: "349",
    form_factor: "over-ear",
    battery_life_hours: "30",
    battery_anc_hours: "24",
    active_noise_cancellation: "yes",
    transparency_mode: "yes",
    weight_grams: "250",
    bluetooth_version: "5.3",
  };
  const left = product({ slug: "left", specsJson: JSON.stringify(common) });
  const right = product({ slug: "right", specsJson: JSON.stringify(common) });
  const coverage = getHeadphonePairCoverage(left.specsJson, right.specsJson);
  const eligibility = getHeadphoneComparisonEligibility(left, right);
  assert.equal(coverage.sharedCoreFieldCount, 8);
  assert.ok(coverage.coreCoveragePercent >= 70);
  assert.equal(eligibility.eligible, true);
});

test("allows only explicit comparison workflow transitions", () => {
  assert.equal(canTransitionComparison("draft", "needs_review"), true);
  assert.equal(canTransitionComparison("draft", "published"), false);
  assert.equal(canTransitionComparison("needs_review", "approved"), true);
  assert.equal(canTransitionComparison("approved", "published"), true);
});

test("drafts honest verdicts for split and one-sided evidence", () => {
  const left = product({ id: "left-id", slug: "left", canonicalName: "Left", updatedAt: "2026-09-04T01:00:00Z", specsJson: JSON.stringify({ price_usd: "300", battery_life_hours: "40", weight_grams: "300" }) });
  const right = product({ id: "right-id", slug: "right", canonicalName: "Right", updatedAt: "2026-09-04T02:00:00Z", specsJson: JSON.stringify({ price_usd: "400", battery_life_hours: "30", weight_grams: "250" }) });
  const { draft, error } = draftComparisonVerdict(left, right, "travel");
  assert.equal(error, null);
  assert.ok(draft.headline);
  assert.match(draft.buyLeft, /battery life/i);
  assert.match(draft.buyRight, /weight/i);
  assert.equal(draft.preset, "travel");
  assert.equal(draft.scoringVersion, HEADPHONE_SCORING_VERSION);
  assert.equal(draft.dataVersion, comparisonDataVersion(left, right));
  assert.ok(draft.evidence.every((item) => item.sourceUrl.startsWith("https://")));

  const unsupported = draftComparisonVerdict(left, product({ slug: "third", canonicalName: "Third", specsJson: JSON.stringify({ price_usd: "500", battery_life_hours: "20", weight_grams: "350" }) }), "balanced");
  assert.equal(unsupported.error, null);
  assert.ok(unsupported.draft);
  assert.match(unsupported.draft.buyRight, /does not currently show a measured advantage/i);
  assert.ok(unsupported.draft.evidence.length >= 2);
});

test("resolves reversed selections to one pair and gates featured matchups", () => {
  assert.equal(comparisonPairKey("sony", "bose"), comparisonPairKey("bose", "sony"));
  assert.equal(isFeaturedComparison({ status: "published", coveragePercent: 70, verdictStatus: "approved" }), true);
  assert.equal(isFeaturedComparison({ status: "published", coveragePercent: 69, verdictStatus: "approved" }), false);
  assert.equal(isFeaturedComparison({ status: "draft", coveragePercent: 100, verdictStatus: "approved" }), false);
  assert.equal(isFeaturedComparison({ status: "published", coveragePercent: 100, verdictStatus: "draft" }), false);
});
