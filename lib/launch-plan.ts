import { getHeadphoneProductReadiness, type CatalogHeadphone } from "@/lib/headphone-specs";
import { comparisonPairKey } from "@/lib/comparison-pair";

export const HEADPHONES_LAUNCH_PRODUCT_NAMES = [
  "Sony WH-1000XM6",
  "Bose QuietComfort Ultra Headphones (2nd Gen)",
  "AirPods Max 2",
  "Bowers & Wilkins Px8 S2",
  "Focal Bathys MG",
  "MOMENTUM 5 Wireless",
  "Bowers & Wilkins Px7 S3",
  "Cambridge Audio Melomania P100 SE",
  "JBL Tour One M3 Smart Tx",
  "Bang & Olufsen Beoplay H100",
] as const;

export const HEADPHONES_LAUNCH_COMPARISONS = [
  ["Sony WH-1000XM6", "Bose QuietComfort Ultra Headphones (2nd Gen)"],
  ["Sony WH-1000XM6", "AirPods Max 2"],
  ["Sony WH-1000XM6", "Cambridge Audio Melomania P100 SE"],
  ["Bose QuietComfort Ultra Headphones (2nd Gen)", "AirPods Max 2"],
  ["Sony WH-1000XM6", "MOMENTUM 5 Wireless"],
  ["Sony WH-1000XM6", "JBL Tour One M3 Smart Tx"],
  ["Bose QuietComfort Ultra Headphones (2nd Gen)", "MOMENTUM 5 Wireless"],
  ["Bose QuietComfort Ultra Headphones (2nd Gen)", "JBL Tour One M3 Smart Tx"],
  ["AirPods Max 2", "MOMENTUM 5 Wireless"],
  ["AirPods Max 2", "JBL Tour One M3 Smart Tx"],
  ["Bowers & Wilkins Px7 S3", "Sony WH-1000XM6"],
  ["Bowers & Wilkins Px7 S3", "Bose QuietComfort Ultra Headphones (2nd Gen)"],
  ["Bowers & Wilkins Px7 S3", "MOMENTUM 5 Wireless"],
  ["Bowers & Wilkins Px8 S2", "AirPods Max 2"],
  ["Bowers & Wilkins Px8 S2", "Focal Bathys MG"],
  ["Bowers & Wilkins Px8 S2", "Bang & Olufsen Beoplay H100"],
  ["Focal Bathys MG", "AirPods Max 2"],
  ["Focal Bathys MG", "Bang & Olufsen Beoplay H100"],
  ["Bang & Olufsen Beoplay H100", "AirPods Max 2"],
  ["Cambridge Audio Melomania P100 SE", "Bose QuietComfort Ultra Headphones (2nd Gen)"],
] as const;

const identity = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const pairKey = (left: string, right: string) => comparisonPairKey(identity(left), identity(right));
const launchRankByPair = new Map(HEADPHONES_LAUNCH_COMPARISONS.map(([left, right], index) => [pairKey(left, right), index + 1]));

export function getLaunchComparisonRank(leftName: string, rightName: string) {
  return launchRankByPair.get(pairKey(leftName, rightName)) ?? null;
}

export function sortHeadphoneComparisons<T extends { leftProductId: string; rightProductId: string; publishedAt?: string }>(comparisons: T[], productsById: Map<string, { canonicalName: string }>) {
  return [...comparisons].sort((left, right) => {
    const leftA = productsById.get(left.leftProductId); const leftB = productsById.get(left.rightProductId);
    const rightA = productsById.get(right.leftProductId); const rightB = productsById.get(right.rightProductId);
    const leftRank = leftA && leftB ? getLaunchComparisonRank(leftA.canonicalName, leftB.canonicalName) : null;
    const rightRank = rightA && rightB ? getLaunchComparisonRank(rightA.canonicalName, rightB.canonicalName) : null;
    if (leftRank !== null || rightRank !== null) return (leftRank ?? 10_000) - (rightRank ?? 10_000);
    return (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "");
  });
}

export function getLaunchCatalogReadiness(products: CatalogHeadphone[]) {
  const expected = new Set(HEADPHONES_LAUNCH_PRODUCT_NAMES.map(identity));
  const launchProducts = [...new Map(products.filter((product) => expected.has(identity(product.canonicalName))).map((product)=>[identity(product.canonicalName),product])).values()];
  const readyProducts = launchProducts.filter((product) => {
    const readiness = getHeadphoneProductReadiness(product);
    let conflicts: unknown[] = [];
    try { conflicts = JSON.parse((product as CatalogHeadphone & { specConflictsJson?: string }).specConflictsJson ?? "[]");   if (!Array.isArray(conflicts)) conflicts = ["invalid"]; } catch { conflicts = ["invalid"]; }
    return product.status === "published" && product.sourceUrl.startsWith("https://") && Boolean(product.imageUrl) && Boolean(product.description) && readiness.verifiedFieldCount >= 11 && readiness.coreCoveragePercent >= 70 && conflicts.length === 0;
  });
  return { expectedCount: HEADPHONES_LAUNCH_PRODUCT_NAMES.length, foundCount: launchProducts.length, readyCount: readyProducts.length, ready: readyProducts.length === HEADPHONES_LAUNCH_PRODUCT_NAMES.length };
}
