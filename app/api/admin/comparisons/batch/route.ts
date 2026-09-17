import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { comparisonPairKey } from "@/lib/comparison-discovery";
import { comparisonEligibilitySnapshot } from "@/lib/comparison-workflow";
import { type CatalogHeadphone } from "@/lib/headphone-specs";
import { selectComparisonDraftCandidates } from "@/lib/comparison-batch";

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const payload = await request.json().catch(() => ({})) as { limit?: number };
  const limit = Math.min(20, Math.max(1, Number.isInteger(payload.limit) ? Number(payload.limit) : 20));
  const db = getDb();
  const [products, existing] = await Promise.all([
    db.select().from(catalogProducts).where(eq(catalogProducts.categorySlug, "headphones")),
    db.select({ pairKey: comparisons.pairKey }).from(comparisons).where(eq(comparisons.categorySlug, "headphones")),
  ]);
  const existingPairs = new Set(existing.map((comparison) => comparison.pairKey));
  const candidates = selectComparisonDraftCandidates(products as CatalogHeadphone[], existingPairs, limit);

  const created: Array<{ slug: string; leftName: string; rightName: string; coveragePercent: number }> = [];
  for (const candidate of candidates) {
    const id = crypto.randomUUID();
    const pairKey = comparisonPairKey(candidate.left.id, candidate.right.id);
    const slug = [candidate.left.slug, candidate.right.slug].sort().join("-vs-");
    const now = new Date().toISOString();
    await db.insert(comparisons).values({
      id,
      slug,
      pairKey,
      categorySlug: "headphones",
      leftProductId: candidate.left.id,
      rightProductId: candidate.right.id,
      createdBy: auth.user.userId,
      status: "needs_review",
      coveragePercent: candidate.coverage.coreCoveragePercent,
      scoringVersion: candidate.coverage.scoringVersion,
      eligibilityJson: comparisonEligibilitySnapshot(candidate.coverage),
      verdictStatus: "draft",
      verdictHeadline: candidate.verdict.headline,
      verdict: candidate.verdict.summary,
      verdictBuyLeft: candidate.verdict.buyLeft,
      verdictBuyRight: candidate.verdict.buyRight,
      verdictEvidenceJson: JSON.stringify(candidate.verdict.evidence),
      verdictPreset: candidate.verdict.preset,
      verdictScoringVersion: candidate.verdict.scoringVersion,
      verdictDataVersion: candidate.verdict.dataVersion,
      verdictDraftedAt: now,
      updatedAt: now,
    });
    created.push({ slug, leftName: candidate.left.canonicalName, rightName: candidate.right.canonicalName, coveragePercent: candidate.coverage.coreCoveragePercent });
  }

  return Response.json({ created: created.length, available: candidates.length, pairs: created });
}
