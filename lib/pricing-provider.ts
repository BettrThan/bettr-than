import type { OfferAvailability } from "@/lib/offers";

export type ProviderProductMapping = {
  productId: string;
  providerProductId: string;
  retailerSlug: string;
};

export type ProviderOfferResult = {
  providerKey: string;
  providerProductId: string;
  destinationUrl: string;
  priceMinor: number;
  shippingMinor: number | null;
  totalPriceMinor: number;
  currency: string;
  availability: OfferAvailability;
  retrievedAt: string;
};

export type ProviderFailure = {
  providerKey: string;
  providerProductId: string;
  errorCode: "not_found" | "rate_limited" | "unavailable" | "invalid_response";
  retryAfterSeconds: number | null;
};

export interface PricingProvider {
  readonly key: string;
  fetchOffer(mapping: ProviderProductMapping): Promise<{ offer: ProviderOfferResult | null; failure: ProviderFailure | null }>;
}

type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  wait?: (milliseconds: number) => Promise<void>;
};

const retryableErrors = new Set<ProviderFailure["errorCode"]>(["rate_limited", "unavailable"]);
const defaultWait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function fetchProviderOffer(provider: PricingProvider, mapping: ProviderProductMapping, options: RetryOptions = {}) {
  if (!provider.key.trim()) throw new Error("Pricing provider needs a stable key.");
  const maxAttempts = Math.max(1, Math.min(3, options.maxAttempts ?? 3));
  const baseDelayMs = Math.max(0, Math.min(5_000, options.baseDelayMs ?? 250));
  const wait = options.wait ?? defaultWait;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await provider.fetchOffer(mapping);
    if (result.offer || !result.failure || !retryableErrors.has(result.failure.errorCode) || attempt === maxAttempts) return result;
    const requestedDelay = result.failure.retryAfterSeconds == null ? baseDelayMs * 2 ** (attempt - 1) : result.failure.retryAfterSeconds * 1_000;
    await wait(Math.min(requestedDelay, 5_000));
  }
  throw new Error("Pricing provider retry loop ended unexpectedly.");
}
