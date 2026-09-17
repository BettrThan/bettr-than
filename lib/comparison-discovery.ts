import { scoreSmartphoneComparison, smartphoneDataVersion, SMARTPHONE_SCORING_VERSION } from "@/lib/smartphone-specs";
import { HEADPHONE_PUBLIC_COVERAGE_THRESHOLD, HEADPHONE_SCORING_VERSION, type CatalogHeadphone } from "@/lib/headphone-specs";
import { getHeadphoneComparisonEligibility } from "@/lib/comparison-workflow";
import { comparisonDataVersion } from "@/lib/verdicts";
import { extendedCategoryModels, extendedDataVersion, isExtendedCategory, scoreExtendedComparison } from "@/lib/extended-category-specs";

export { comparisonPairKey } from "@/lib/comparison-pair";

type PublicComparison = {
  status: string;
  verdictStatus: string;
  verdictScoringVersion: string | null;
  verdictDataVersion: string | null;
};

type ComparisonProduct = CatalogHeadphone & {
  categorySlug?: string;
  updatedAt?: string | null;
};

export function isFeaturedComparison(comparison: { status?: string; coveragePercent: number; verdictStatus: string }) {
  return (!comparison.status || comparison.status === "published")
    && comparison.verdictStatus === "approved"
    && comparison.coveragePercent >= HEADPHONE_PUBLIC_COVERAGE_THRESHOLD;
}

export function isCurrentPublicComparison(
  comparison: PublicComparison,
  left: ComparisonProduct,
  right: ComparisonProduct,
) {
  const category = left.categorySlug;
  if (category === "smartphones") {
    return right.status === "published"
      && left.status === "published"
      && right.categorySlug === "smartphones"
      && comparison.status === "published"
      && comparison.verdictStatus === "approved"
      && comparison.verdictScoringVersion === SMARTPHONE_SCORING_VERSION
      && comparison.verdictDataVersion === smartphoneDataVersion(left, right)
      && scoreSmartphoneComparison(left, right).eligible;
  }

  if (category && isExtendedCategory(category)) {
    return right.status === "published"
      && left.status === "published"
      && right.categorySlug === category
      && comparison.status === "published"
      && comparison.verdictStatus === "approved"
      && comparison.verdictScoringVersion === extendedCategoryModels[category].scoringVersion
      && comparison.verdictDataVersion === extendedDataVersion(category, left, right)
      && scoreExtendedComparison(category, left, right).eligible;
  }

  const eligibility = getHeadphoneComparisonEligibility(left, right);
  return comparison.status === "published"
    && comparison.verdictStatus === "approved"
    && comparison.verdictScoringVersion === HEADPHONE_SCORING_VERSION
    && comparison.verdictDataVersion === comparisonDataVersion(left, right)
    && eligibility.eligible;
}
