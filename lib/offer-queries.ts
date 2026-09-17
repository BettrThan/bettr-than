import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { retailerOffers, retailers } from "@/db/schema";
import { normalizeAvailability, rankPublicOffers, safeCommerceUrl, type PublicOffer } from "@/lib/offers";
export async function getPublicOffers(productIds: string[]) {
  if (productIds.length === 0)
    return new Map<string, PublicOffer[]>();
  const db = getDb();
  const [offers, retailerRows] = await Promise.all([
    db.select().from(retailerOffers).where(and(inArray(retailerOffers.productId, productIds), eq(retailerOffers.status, "approved"))),
    db.select().from(retailers).where(eq(retailers.enabled, true)),
  ]);
  const retailerById = new Map(retailerRows.map((retailer) => [retailer.id, retailer]));
  const output = new Map<string, PublicOffer[]>();
  for (const offer of offers) {
    const retailer = retailerById.get(offer.retailerId);
    const availability = normalizeAvailability(offer.availability);
    if (!retailer || !availability || !safeCommerceUrl(offer.destinationUrl) || offer.currency !== "USD" || !Number.isSafeInteger(offer.priceMinor) || offer.priceMinor < 0 || (offer.shippingMinor !== null && (!Number.isSafeInteger(offer.shippingMinor) || offer.shippingMinor < 0)) || !Number.isFinite(Date.parse(offer.lastCheckedAt)) || Date.parse(offer.lastCheckedAt) > Date.now() + 60000)
      continue;
    const item: PublicOffer = {
      id: offer.id,
      productId: offer.productId,
      retailerName: retailer.name,
      priceMinor: offer.priceMinor,
      shippingMinor: offer.shippingMinor,
      totalPriceMinor: offer.priceMinor + (offer.shippingMinor ?? 0),
      currency: offer.currency,
      availability,
      isAffiliate: offer.isAffiliate,
      isSponsored: offer.isSponsored,
      lastCheckedAt: offer.lastCheckedAt,
      staleAfterAt: offer.staleAfterAt,
    };
    output.set(offer.productId, [...(output.get(offer.productId) ?? []), item]);
  }
  for (const [productId, values] of output)
    output.set(productId, rankPublicOffers(values));
  return output;
}
