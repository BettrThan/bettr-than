export const offerAvailabilityValues = ["in_stock", "out_of_stock", "preorder", "unknown"] as const;
export const offerStatusValues = ["draft", "approved", "disabled"] as const;
export const affiliateStatusValues = ["none", "affiliate", "sponsored"] as const;

export type OfferAvailability = typeof offerAvailabilityValues[number];
export type OfferStatus = typeof offerStatusValues[number];
export type AffiliateStatus = typeof affiliateStatusValues[number];

export type PublicOffer = {
  id: string;
  productId: string;
  retailerName: string;
  priceMinor: number;
  shippingMinor: number | null;
  totalPriceMinor: number;
  currency: string;
  availability: OfferAvailability;
  isAffiliate: boolean;
  isSponsored: boolean;
  lastCheckedAt: string;
  staleAfterAt: string;
};

export function safeCommerceUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value.trim());
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || !hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.includes(":") || /^\d+(?:\.\d+){3}$/.test(hostname) || (parsed.port && parsed.port !== "443")) return null;
    if (/^(?:127\.|10\.|192\.168\.|169\.254\.)/.test(hostname)) return null;
    const private172 = hostname.match(/^172\.(\d+)\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function moneyToMinor(value: unknown) {
  const normalized = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim().replace(/[$,]/g, "") : "";
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return null;
  return Math.round(amount * 100);
}

export function formatMoney(minor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

export function staleAfter(lastCheckedAt: string, days = 7) {
  const timestamp = new Date(lastCheckedAt).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp + days * 86_400_000).toISOString();
}

export function isStaleOffer(offer: Pick<PublicOffer, "staleAfterAt">, now = new Date()) {
  const staleAt = new Date(offer.staleAfterAt).getTime();
  return !Number.isFinite(staleAt) || staleAt <= now.getTime();
}

export function rankPublicOffers(offers: PublicOffer[], now = new Date()) {
  return [...offers].sort((left, right) => {
    const leftStock = left.availability === "in_stock" ? 0 : 1;
    const rightStock = right.availability === "in_stock" ? 0 : 1;
    if (leftStock !== rightStock) return leftStock - rightStock;
    const leftStale = Number(isStaleOffer(left, now));
    const rightStale = Number(isStaleOffer(right, now));
    if (leftStale !== rightStale) return leftStale - rightStale;
    const leftComparable = left.shippingMinor !== null;
    const rightComparable = right.shippingMinor !== null;
    if (leftComparable !== rightComparable) return Number(rightComparable) - Number(leftComparable);
    if (leftComparable && rightComparable && left.currency === right.currency && left.totalPriceMinor !== right.totalPriceMinor) return left.totalPriceMinor - right.totalPriceMinor;
    return left.retailerName.localeCompare(right.retailerName);
  });
}

export function normalizeAvailability(value: unknown): OfferAvailability | null {
  return typeof value === "string" && offerAvailabilityValues.includes(value as OfferAvailability) ? value as OfferAvailability : null;
}

export function normalizeAffiliateStatus(value: unknown): AffiliateStatus | null {
  return typeof value === "string" && affiliateStatusValues.includes(value as AffiliateStatus) ? value as AffiliateStatus : null;
}

export function lowestComparableOfferIds(offers:PublicOffer[],now=new Date()) {
  const candidates=offers.filter(offer=>offer.availability==="in_stock"&&!isStaleOffer(offer,now)&&offer.shippingMinor!==null);
  if(candidates.length<2||new Set(candidates.map(offer=>offer.currency)).size!==1)return new Set<string>();
  const lowest=Math.min(...candidates.map(offer=>offer.totalPriceMinor));
  return new Set(candidates.filter(offer=>offer.totalPriceMinor===lowest).map(offer=>offer.id));
}
