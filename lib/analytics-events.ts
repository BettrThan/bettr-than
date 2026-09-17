import { isPublicSiteHostname } from "@/lib/site-hostname";

export const decisionEventNames = [
  "guide_viewed",
  "finder_viewed",
  "picker_started",
  "picker_completed",
  "comparison_viewed",
  "preset_changed",
  "vote_completed",
  "retailer_clicked",
  "comparison_zero_results",
  "matchup_unavailable",
] as const;

export type DecisionEventName = typeof decisionEventNames[number];
export type DecisionEventPayload = {
  eventName: DecisionEventName;
  journeyId?: string;
  categorySlug?: string;
  comparisonSlug?: string;
  productIds?: string[];
  presetKey?: string;
  metadata?: Record<string, string>;
};

const slugPattern = /^[a-z0-9][a-z0-9-]{0,119}$/;
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/;
const metadataKeys = new Set(["choiceSlug", "dimensionType", "dimensionKey", "retailerName"]);

export function normalizeDecisionEvent(value: unknown): DecisionEventPayload | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.eventName !== "string" || !decisionEventNames.includes(input.eventName as DecisionEventName)) return null;
  const journeyId = typeof input.journeyId === "string" && idPattern.test(input.journeyId) ? input.journeyId : undefined;
  const categorySlug = typeof input.categorySlug === "string" && slugPattern.test(input.categorySlug) ? input.categorySlug : undefined;
  const comparisonSlug = typeof input.comparisonSlug === "string" && slugPattern.test(input.comparisonSlug) ? input.comparisonSlug : undefined;
  const presetKey = typeof input.presetKey === "string" && slugPattern.test(input.presetKey) ? input.presetKey : undefined;
  const productIds = Array.isArray(input.productIds) ? input.productIds.filter((item): item is string => typeof item === "string" && idPattern.test(item)).slice(0, 2) : [];
  const metadata: Record<string, string> = {};
  if (input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)) {
    for (const [key, raw] of Object.entries(input.metadata as Record<string, unknown>)) {
      if (metadataKeys.has(key) && typeof raw === "string" && raw.length <= 120 && (slugPattern.test(raw) || idPattern.test(raw))) metadata[key] = raw;
    }
  }
  return { eventName: input.eventName as DecisionEventName, journeyId, categorySlug, comparisonSlug, productIds, presetKey, metadata };
}

export function shouldIgnoreAnalyticsRequest(request: Request) {
  if (request.headers.get("x-bt-analytics-test") === "1") return true;
  const hostname = new URL(request.url).hostname.toLowerCase();
  return !isPublicSiteHostname(hostname);
}
