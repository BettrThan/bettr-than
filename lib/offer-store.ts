import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, priceObservations, productRetailerMappings, retailerOffers, retailers } from "@/db/schema";
import { slugify } from "@/lib/agents/product-ingestion";
import { validateOfferInput, type OfferPayload } from "@/lib/offer-input";
export async function saveManualOffer(payload: OfferPayload, userId: string, db = getDb()) {
  const input = validateOfferInput(payload), { productId, retailerName, retailerUrl, affiliateStatus, destinationUrl, priceMinor, shippingMinor, currency, availability, status, checkedAt, staleAt, requestedId } = input;
  const [product] = await db.select({
    id: catalogProducts.id
  }).from(catalogProducts).where(and(eq(catalogProducts.id, productId), eq(catalogProducts.status, "published"))).limit(1);
  if (!product)
    throw new Error("Choose an approved public product.");
  const retailerSlug = slugify(retailerName), now = new Date().toISOString();
  const [retailer] = await db.select().from(retailers).where(eq(retailers.slug, retailerSlug)).limit(1);
  const retailerId = retailer?.id ?? crypto.randomUUID();
  const [mapping] = await db.select().from(productRetailerMappings).where(and(eq(productRetailerMappings.productId, productId), eq(productRetailerMappings.retailerId, retailerId), eq(productRetailerMappings.providerKey, "manual"))).limit(1);
  const [existing] = requestedId ? await db.select().from(retailerOffers).where(eq(retailerOffers.id, requestedId)).limit(1) : await db.select().from(retailerOffers).where(and(eq(retailerOffers.productId, productId), eq(retailerOffers.retailerId, retailerId), eq(retailerOffers.offerKey, "manual-primary"))).limit(1);
  if (requestedId && !existing)
    throw new Error("That offer no longer exists. Reload the offer manager.");
  if (existing && (existing.productId !== productId || existing.retailerId !== retailerId))
    throw new Error("An existing offer cannot be moved to another product or retailer.");
  const mappingId = mapping?.id ?? crypto.randomUUID(), offerId = existing?.id ?? crypto.randomUUID(), totalPriceMinor = priceMinor + (shippingMinor ?? 0);
  const values = {
    offerKey: "manual-primary", productId, retailerId, mappingId, providerKey: "manual", sourceType: "manual", destinationUrl, priceMinor, shippingMinor, totalPriceMinor, currency, availability, status, isAffiliate: affiliateStatus !== "none", isSponsored: affiliateStatus === "sponsored", lastCheckedAt: checkedAt, staleAfterAt: staleAt, providerError: null, createdBy: userId, updatedAt: now
  };
  // One D1 transaction per offer: the offer and its observation cannot diverge.
  await db.batch([
    db.insert(retailers).values({
      id: retailerId, name: retailerName, slug: retailerSlug, homepageUrl: retailerUrl, enabled: true, affiliateStatus, createdAt: now, updatedAt: now
    }).onConflictDoUpdate({
      target: retailers.id, set: {
        name: retailerName, homepageUrl: retailerUrl, affiliateStatus, updatedAt: now
      }
    }),
    mapping ? db.update(productRetailerMappings).set({
      updatedAt: now
    }).where(eq(productRetailerMappings.id, mappingId)) : db.insert(productRetailerMappings).values({
      id: mappingId, productId, retailerId, providerKey: "manual", providerProductId: null, status: "approved", createdAt: now, updatedAt: now
    }),
    db.insert(retailerOffers).values({
      id: offerId, ...values
    }).onConflictDoUpdate({
      target: retailerOffers.id, set: values
    }),
    db.insert(priceObservations).values({
      offerId, priceMinor, shippingMinor, totalPriceMinor, currency, availability, sourceType: "manual", observedAt: checkedAt
    }),
  ]);
  return {
    id: offerId, status, created: !existing
  };
}
