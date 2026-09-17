import { moneyToMinor, normalizeAffiliateStatus, normalizeAvailability, safeCommerceUrl, staleAfter, type OfferStatus } from "@/lib/offers";
export type OfferPayload = {
  offerId?: string;
  productId?: string;
  retailerName?: string;
  retailerUrl?: string;
  affiliateStatus?: string;
  destinationUrl?: string;
  price?: string | number;
  shipping?: string | number | null;
  currency?: string;
  availability?: string;
  checkedAt?: string;
  status?: string;
};
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
export function validateOfferInput(payload: OfferPayload, now = new Date()) {
  const productId = clean(payload.productId, 100), retailerName = clean(payload.retailerName, 120), retailerUrl = safeCommerceUrl(payload.retailerUrl), destinationUrl = safeCommerceUrl(payload.destinationUrl);
  const affiliateStatus = normalizeAffiliateStatus(payload.affiliateStatus), priceMinor = moneyToMinor(payload.price), shippingMinor = payload.shipping === "" || payload.shipping == null ? null : moneyToMinor(payload.shipping);
  const currency = clean(payload.currency, 3).toUpperCase(), availability = normalizeAvailability(payload.availability), time = Date.parse(clean(payload.checkedAt, 40));
  const status = payload.status === "draft" || payload.status === "approved" ? payload.status as OfferStatus : null;
  if (!productId || !retailerName || !/[a-z0-9]/i.test(retailerName))
    throw new Error("Choose a product and provide a retailer name.");
  if (!retailerUrl || !destinationUrl)
    throw new Error("Retailer and offer links must be public HTTPS URLs.");
  if (priceMinor === null || (payload.shipping !== "" && payload.shipping != null && shippingMinor === null) || currency !== "USD")
    throw new Error("Enter a valid USD price and shipping amount; leave shipping blank if unknown.");
  if (!Number.isFinite(time) || time > now.getTime() + 60000)
    throw new Error("Checked time must be valid and cannot be in the future.");
  if (!availability || !affiliateStatus || !status)
    throw new Error("Choose availability, relationship, and a draft or approved state.");
  const checkedAt = new Date(time).toISOString();
  return {
    productId, retailerName, retailerUrl, destinationUrl, affiliateStatus, priceMinor, shippingMinor, currency, availability, status, checkedAt, staleAt: staleAfter(checkedAt)!, requestedId: clean(payload.offerId, 100)
  };
}
