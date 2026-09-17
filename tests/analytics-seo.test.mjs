import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true } });
after(async () => { await vite.close(); });

const { decisionEventNames, normalizeDecisionEvent, shouldIgnoreAnalyticsRequest } = await vite.ssrLoadModule("/lib/analytics-events.ts");
const { comparisonJsonLd, isIndexableCatalogProduct, productJsonLd, serializeJsonLd } = await vite.ssrLoadModule("/lib/seo.ts");

const product = {
  status: "published",
  slug: "example-headphones",
  canonicalName: "Example Headphones",
  brand: "Example",
  description: "Verified example.",
  imageUrl: "https://example.com/image.jpg",
  sourceUrl: "https://example.com/specs",
  specsJson: JSON.stringify({ price_usd: "349", weight_grams: "250", battery_life_hours: "30" }),
};

test("keeps decision analytics to a stable privacy-light allowlist", () => {
  assert.equal(decisionEventNames.length, 10);
  for (const eventName of ["guide_viewed", "finder_viewed"]) {
    const normalized = normalizeDecisionEvent({ eventName, categorySlug: "headphones" });
    assert.equal(normalized.eventName, eventName);
    assert.equal(normalized.categorySlug, "headphones");
  }
  const event = normalizeDecisionEvent({ eventName: "vote_completed", journeyId: "journey-1", comparisonSlug: "left-vs-right", productIds: ["left", "right", "ignored"], metadata: { choiceSlug: "left", notes: "free-form content" } });
  assert.equal(event.eventName, "vote_completed");
  assert.deepEqual(event.productIds, ["left", "right"]);
  assert.deepEqual(event.metadata, { choiceSlug: "left" });
  assert.equal(normalizeDecisionEvent({ eventName: "email_captured" }), null);
});

test("excludes development and automated test requests", () => {
  assert.equal(shouldIgnoreAnalyticsRequest(new Request("http://terminal.local/api/analytics")), true);
  assert.equal(shouldIgnoreAnalyticsRequest(new Request("https://www.bettrthan.com/api/analytics", { headers: { "x-bt-analytics-test": "1" } })), true);
  assert.equal(shouldIgnoreAnalyticsRequest(new Request("https://www.bettrthan.com/api/analytics")), false);
});

test("indexes only sufficiently complete approved catalog products", () => {
  assert.equal(isIndexableCatalogProduct(product), true);
  assert.equal(isIndexableCatalogProduct({ ...product, specsJson: JSON.stringify({ price_usd: "349" }) }), false);
  assert.equal(isIndexableCatalogProduct({ ...product, status: "draft" }), false);
});

test("structured data reflects present product facts without invented ratings", () => {
  const data = productJsonLd(product);
  assert.equal(data["@type"], "Product");
  assert.equal(data.additionalProperty.length, 3);
  assert.equal("aggregateRating" in data, false);
  assert.equal("offers" in data, false);
  const comparison = comparisonJsonLd("example-vs-other", product, { ...product, slug: "other", canonicalName: "Other Headphones" });
  assert.equal(comparison.mainEntity.numberOfItems, 2);
  assert.doesNotMatch(serializeJsonLd({ value: "</script>" }), /<\/script>/);
});
