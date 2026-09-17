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

after(async () => { await vite.close(); });

const { moneyToMinor, rankPublicOffers, safeCommerceUrl, staleAfter, lowestComparableOfferIds } = await vite.ssrLoadModule("/lib/offers.ts");
const { fetchProviderOffer } = await vite.ssrLoadModule("/lib/pricing-provider.ts");

const observedAt = "2026-09-05T12:00:00.000Z";
const staleAt = staleAfter(observedAt);

function offer(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    productId: "product-1",
    retailerName: "Retailer",
    priceMinor: 30_000,
    shippingMinor: 0,
    totalPriceMinor: 30_000,
    currency: "USD",
    availability: "in_stock",
    isAffiliate: false,
    isSponsored: false,
    lastCheckedAt: observedAt,
    staleAfterAt: staleAt,
    ...overrides,
  };
}

test("accepts public HTTPS offer URLs and rejects unsafe destinations", () => {
  assert.equal(safeCommerceUrl("https://example.com/headphones"), "https://example.com/headphones");
  assert.equal(safeCommerceUrl("http://example.com/headphones"), null);
  assert.equal(safeCommerceUrl("https://localhost/headphones"), null);
  assert.equal(safeCommerceUrl("https://10.0.0.1/headphones"), null);
  assert.equal(safeCommerceUrl("https://user:pass@example.com/headphones"), null);
});

test("normalizes manual USD inputs to integer minor units", () => {
  assert.equal(moneyToMinor("$349.99"), 34_999);
  assert.equal(moneyToMinor("0"), 0);
  assert.equal(moneyToMinor("12.999"), null);
  assert.equal(moneyToMinor("-1"), null);
});

test("lowest-total labels require competing fresh in-stock offers with comparable currencies",()=>{
 const now=new Date("2026-09-06T12:00:00Z"),a=offer({id:'a'}),b=offer({id:'b',totalPriceMinor:31000});
 assert.deepEqual([...lowestComparableOfferIds([a,b],now)],['a']);
 assert.equal(lowestComparableOfferIds([a],now).size,0);
 assert.equal(lowestComparableOfferIds([a,{...b,currency:'EUR'}],now).size,0);
 assert.equal(lowestComparableOfferIds([a,{...b,availability:'preorder'}],now).size,0);
 assert.equal(lowestComparableOfferIds([a,{...b,shippingMinor:null}],now).size,0);
 assert.equal(lowestComparableOfferIds([a,b],new Date('2026-09-20')).size,0);
});

test("ranks in-stock fresh comparable totals without commercial influence", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");
  const winner = offer({ retailerName: "Honest Audio", totalPriceMinor: 30_000 });
  const sponsored = offer({ retailerName: "Sponsored Shop", priceMinor: 29_900, totalPriceMinor: 30_500, isAffiliate: true, isSponsored: true });
  const unknownShipping = offer({ retailerName: "Unknown Shipping", priceMinor: 20_000, shippingMinor: null, totalPriceMinor: 20_000 });
  const outOfStock = offer({ retailerName: "Unavailable", priceMinor: 10_000, totalPriceMinor: 10_000, availability: "out_of_stock" });
  assert.deepEqual(rankPublicOffers([outOfStock, sponsored, unknownShipping, winner], now).map((item) => item.retailerName), ["Honest Audio", "Sponsored Shop", "Unknown Shipping", "Unavailable"]);
});

test("keeps provider integrations behind one stable adapter contract", async () => {
  const mapping = { productId: "product-1", providerProductId: "sku-1", retailerSlug: "shop" };
  const provider = { key: "fixture", async fetchOffer(received) { return { offer: { providerKey: "fixture", providerProductId: received.providerProductId, destinationUrl: "https://example.com/sku-1", priceMinor: 30_000, shippingMinor: 0, totalPriceMinor: 30_000, currency: "USD", availability: "in_stock", retrievedAt: observedAt }, failure: null }; } };
  const result = await fetchProviderOffer(provider, mapping);
  assert.equal(result.offer.providerProductId, "sku-1");
  await assert.rejects(() => fetchProviderOffer({ ...provider, key: " " }, mapping), /stable key/);
});

test("uses bounded provider retries and returns one final result for persistence", async () => {
  const delays = [];
  let attempts = 0;
  const mapping = { productId: "product-1", providerProductId: "sku-1", retailerSlug: "shop" };
  const provider = { key: "fixture", async fetchOffer() { attempts += 1; return attempts < 3 ? { offer: null, failure: { providerKey: "fixture", providerProductId: "sku-1", errorCode: "rate_limited", retryAfterSeconds: null } } : { offer: { providerKey: "fixture", providerProductId: "sku-1", destinationUrl: "https://example.com/sku-1", priceMinor: 30_000, shippingMinor: 0, totalPriceMinor: 30_000, currency: "USD", availability: "in_stock", retrievedAt: observedAt }, failure: null }; } };
  const result = await fetchProviderOffer(provider, mapping, { maxAttempts: 3, baseDelayMs: 10, wait: async (milliseconds) => { delays.push(milliseconds); } });
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);
  assert.equal(result.offer.priceMinor, 30_000);
});

test("does not retry non-transient provider failures", async () => {
  let attempts = 0;
  const mapping = { productId: "product-1", providerProductId: "missing", retailerSlug: "shop" };
  const provider = { key: "fixture", async fetchOffer() { attempts += 1; return { offer: null, failure: { providerKey: "fixture", providerProductId: "missing", errorCode: "not_found", retryAfterSeconds: null } }; } };
  const result = await fetchProviderOffer(provider, mapping, { wait: async () => { throw new Error("should not wait"); } });
  assert.equal(attempts, 1);
  assert.equal(result.failure.errorCode, "not_found");
});
