import {
  HEADPHONE_PUBLIC_COVERAGE_THRESHOLD,
  HEADPHONE_SCORING_VERSION,
  getHeadphonePairCoverageForProducts,
  type CatalogHeadphone,
} from "@/lib/headphone-specs";

export type ComparisonStatus = "draft" | "needs_review" | "approved" | "published";

export const comparisonStatuses: ComparisonStatus[] = [
  "draft",
  "needs_review",
  "approved",
  "published",
];

export function isComparisonStatus(value: unknown): value is ComparisonStatus {
  return typeof value === "string" && comparisonStatuses.includes(value as ComparisonStatus);
}

export function isPublicProduct(product: Pick<CatalogHeadphone, "status">) {
  return !product.status || product.status === "published";
}

export function getHeadphoneComparisonEligibility(
  left: CatalogHeadphone,
  right: CatalogHeadphone,
) {
  const coverage = getHeadphonePairCoverageForProducts(left, right);
  const reasons: string[] = [];
  if (!isPublicProduct(left)) reasons.push(`${left.canonicalName} is not published.`);
  if (!isPublicProduct(right)) reasons.push(`${right.canonicalName} is not published.`);
  if (coverage.coreCoveragePercent < HEADPHONE_PUBLIC_COVERAGE_THRESHOLD) {
    reasons.push(
      `Shared core-field coverage is ${coverage.coreCoveragePercent}%; ${HEADPHONE_PUBLIC_COVERAGE_THRESHOLD}% is required.`,
    );
  }
  return {
    ...coverage,
    threshold: HEADPHONE_PUBLIC_COVERAGE_THRESHOLD,
    scoringVersion: HEADPHONE_SCORING_VERSION,
    eligible: reasons.length === 0,
    reasons,
  };
}

export function canTransitionComparison(
  current: ComparisonStatus,
  next: ComparisonStatus,
) {
  const allowed: Record<ComparisonStatus, ComparisonStatus[]> = {
    draft: ["needs_review"],
    needs_review: ["draft", "approved"],
    approved: ["needs_review", "published"],
    published: ["needs_review"],
  };
  return allowed[current].includes(next);
}

export function comparisonEligibilitySnapshot(
  eligibility: ReturnType<typeof getHeadphoneComparisonEligibility>,
) {
  return JSON.stringify({
    threshold: eligibility.threshold,
    coreCoveragePercent: eligibility.coreCoveragePercent,
    scoreCoverage: eligibility.scoreCoverage,
    sharedCoreFieldCount: eligibility.sharedCoreFieldCount,
    coreFieldCount: eligibility.coreFieldCount,
    scoringVersion: eligibility.scoringVersion,
    reasons: eligibility.reasons,
    evaluatedAt: new Date().toISOString(),
  });
}
