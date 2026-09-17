import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { comparisonPairKey } from "@/lib/comparison-pair";
import {
  canTransitionComparison,
  comparisonEligibilitySnapshot,
  getHeadphoneComparisonEligibility,
  isComparisonStatus,
  type ComparisonStatus,
} from "@/lib/comparison-workflow";
import { HEADPHONE_SCORING_VERSION, type CatalogHeadphone } from "@/lib/headphone-specs";
import { comparisonDataVersion } from "@/lib/verdicts";

async function comparisonProducts(leftProductId: string, rightProductId: string) {
  return getDb().select().from(catalogProducts).where(and(
    inArray(catalogProducts.id, [leftProductId, rightProductId]),
    eq(catalogProducts.categorySlug, "headphones"),
  ));
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const payload = await request.json() as { leftProductId?: string; rightProductId?: string };
  const leftProductId = payload.leftProductId?.trim();
  const rightProductId = payload.rightProductId?.trim();
  if (!leftProductId || !rightProductId || leftProductId === rightProductId) return Response.json({ error: "Choose two different products." }, { status: 400 });
  const db = getDb();
  const products = await comparisonProducts(leftProductId, rightProductId);
  if (products.length !== 2) return Response.json({ error: "Both products must be Headphones catalog entries." }, { status: 400 });
  const left = products.find((product) => product.id === leftProductId)!;
  const right = products.find((product) => product.id === rightProductId)!;
  if (left.status !== "published" || right.status !== "published") return Response.json({ error: "Both products must be owner-approved and published before comparison review." }, { status: 422 });
  const eligibility = getHeadphoneComparisonEligibility(left as CatalogHeadphone, right as CatalogHeadphone);
  const pairKey = comparisonPairKey(left.id, right.id);
  const slug = [left.slug, right.slug].sort().join("-vs-");
  const [existing] = await db.select().from(comparisons).where(eq(comparisons.pairKey, pairKey)).limit(1);
  if (existing) return Response.json({ slug: existing.slug, status: existing.status, duplicate: true, eligibility });
  await db.insert(comparisons).values({
    id: crypto.randomUUID(),
    slug,
    pairKey,
    categorySlug: "headphones",
    leftProductId: left.id,
    rightProductId: right.id,
    createdBy: auth.user.userId,
    status: "draft",
    coveragePercent: eligibility.coreCoveragePercent,
    scoringVersion: eligibility.scoringVersion,
    eligibilityJson: comparisonEligibilitySnapshot(eligibility),
  });
  return Response.json({ slug, status: "draft", eligibility }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const payload = await request.json() as { comparisonId?: string; nextStatus?: ComparisonStatus };
  const comparisonId = payload.comparisonId?.trim();
  if (!comparisonId || !isComparisonStatus(payload.nextStatus)) return Response.json({ error: "Choose a comparison and a valid review state." }, { status: 400 });
  const db = getDb();
  const [record] = await db.select().from(comparisons).where(eq(comparisons.id, comparisonId)).limit(1);
  if (!record || !isComparisonStatus(record.status)) return Response.json({ error: "Comparison not found." }, { status: 404 });
  if (!canTransitionComparison(record.status, payload.nextStatus)) return Response.json({ error: `A ${record.status.replace("_", " ")} comparison cannot move directly to ${payload.nextStatus.replace("_", " ")}.` }, { status: 409 });
  const products = await comparisonProducts(record.leftProductId, record.rightProductId);
  if (products.length !== 2) return Response.json({ error: "Both catalog products are required." }, { status: 422 });
  const leftProduct = products.find((product) => product.id === record.leftProductId)!;
  const rightProduct = products.find((product) => product.id === record.rightProductId)!;
  const eligibility = getHeadphoneComparisonEligibility(leftProduct as CatalogHeadphone, rightProduct as CatalogHeadphone);
  if (["approved", "published"].includes(payload.nextStatus) && !eligibility.eligible) return Response.json({ error: eligibility.reasons.join(" "), eligibility }, { status: 422 });
  if (payload.nextStatus === "published" && (record.verdictStatus !== "approved" || record.verdictScoringVersion !== HEADPHONE_SCORING_VERSION || record.verdictDataVersion !== comparisonDataVersion(leftProduct, rightProduct))) return Response.json({ error: "Approve a current evidence-backed editorial verdict before publishing this comparison." }, { status: 422 });
  const now = new Date().toISOString();
  await db.update(comparisons).set({
    status: payload.nextStatus,
    coveragePercent: eligibility.coreCoveragePercent,
    scoringVersion: eligibility.scoringVersion,
    eligibilityJson: comparisonEligibilitySnapshot(eligibility),
    approvedAt: payload.nextStatus === "approved" ? now : payload.nextStatus === "needs_review" ? null : record.approvedAt,
    publishedAt: payload.nextStatus === "published" ? sql`CURRENT_TIMESTAMP` : record.publishedAt,
    updatedAt: now,
  }).where(eq(comparisons.id, record.id));
  return Response.json({ slug: record.slug, status: payload.nextStatus, eligibility });
}
