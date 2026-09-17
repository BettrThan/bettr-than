import { comparisonPairKey } from "@/lib/comparison-discovery";
import { getHeadphoneComparisonEligibility } from "@/lib/comparison-workflow";
import { type CatalogHeadphone } from "@/lib/headphone-specs";
import { draftComparisonVerdict } from "@/lib/verdicts";

export function buildComparisonCandidates(products: CatalogHeadphone[]) {
  const candidates: Array<{
    left: CatalogHeadphone;
    right: CatalogHeadphone;
    coverage: ReturnType<typeof getHeadphoneComparisonEligibility>;
    verdict: NonNullable<ReturnType<typeof draftComparisonVerdict>["draft"]>;
  }> = [];

  for (let leftIndex = 0; leftIndex < products.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < products.length; rightIndex += 1) {
      const left = products[leftIndex];
      const right = products[rightIndex];
      if (left.status !== "published" || right.status !== "published") continue;
      const coverage = getHeadphoneComparisonEligibility(left, right);
      if (!coverage.eligible) continue;
      const generated = draftComparisonVerdict(left, right, "balanced");
      if (!generated.draft) continue;
      candidates.push({ left, right, coverage, verdict: generated.draft });
    }
  }

  return candidates.sort((a, b) => {
    const brandDifference = Number(b.left.brand !== b.right.brand) - Number(a.left.brand !== a.right.brand);
    return brandDifference * 1000 || b.coverage.coreCoveragePercent - a.coverage.coreCoveragePercent || b.coverage.scoreCoverage - a.coverage.scoreCoverage;
  });
}

export function selectComparisonDraftCandidates(products: CatalogHeadphone[], existingPairKeys: Iterable<string>, limit = 20) {
  const existing = new Set(existingPairKeys);
  return buildComparisonCandidates(products)
    .filter(({ left, right }) => !existing.has(comparisonPairKey(left.id, right.id)))
    .slice(0, Math.min(20, Math.max(1, limit)));
}
