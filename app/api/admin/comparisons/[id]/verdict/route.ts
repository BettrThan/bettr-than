import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { HEADPHONE_SCORING_VERSION, type CatalogHeadphone } from "@/lib/headphone-specs";
import {
  comparisonDataVersion,
  draftComparisonVerdict,
  isHeadphonePreset,
  parseVerdictEvidence,
  sanitizeVerdictCopy,
} from "@/lib/verdicts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const payload = await request.json() as { action?: string; preset?: string; variation?: number; copy?: unknown };
  const db = getDb();
  const [comparison] = await db.select().from(comparisons).where(eq(comparisons.id, id)).limit(1);
  if (!comparison) return Response.json({ error: "Comparison not found." }, { status: 404 });
  const products = await db.select().from(catalogProducts).where(inArray(catalogProducts.id, [comparison.leftProductId, comparison.rightProductId]));
  const left = products.find((product) => product.id === comparison.leftProductId);
  const right = products.find((product) => product.id === comparison.rightProductId);
  if (!left || !right) return Response.json({ error: "Both approved products are required." }, { status: 422 });

  const now = new Date().toISOString();
  if (payload.action === "generate") {
    const preset = isHeadphonePreset(payload.preset) ? payload.preset : "balanced";
    const generated = draftComparisonVerdict(left as CatalogHeadphone, right as CatalogHeadphone, preset, Number(payload.variation) || 0);
    if (!generated.draft) return Response.json({ error: generated.error }, { status: 422 });
    await db.update(comparisons).set({
      verdictStatus: "draft",
      verdictHeadline: generated.draft.headline,
      verdict: generated.draft.summary,
      verdictBuyLeft: generated.draft.buyLeft,
      verdictBuyRight: generated.draft.buyRight,
      verdictEvidenceJson: JSON.stringify(generated.draft.evidence),
      verdictPreset: generated.draft.preset,
      verdictScoringVersion: generated.draft.scoringVersion,
      verdictDataVersion: generated.draft.dataVersion,
      verdictDraftedAt: now,
      verdictApprovedAt: null,
      updatedAt: now,
    }).where(eq(comparisons.id, comparison.id));
    return Response.json({ status: "draft", ...generated.draft });
  }

  if (payload.action === "save") {
    const copy = sanitizeVerdictCopy(payload.copy);
    if (!copy.headline || !copy.summary || !copy.buyLeft || !copy.buyRight) return Response.json({ error: "Headline, summary, and both recommendations are required." }, { status: 400 });
    if (parseVerdictEvidence(comparison.verdictEvidenceJson).length < 2) return Response.json({ error: "Generate an evidence-backed draft before editing it." }, { status: 422 });
    await db.update(comparisons).set({ verdictStatus: "draft", verdictHeadline: copy.headline, verdict: copy.summary, verdictBuyLeft: copy.buyLeft, verdictBuyRight: copy.buyRight, verdictApprovedAt: null, updatedAt: now }).where(eq(comparisons.id, comparison.id));
    return Response.json({ status: "draft", ...copy });
  }

  if (payload.action === "approve") {
    const copy = sanitizeVerdictCopy({ headline: comparison.verdictHeadline, summary: comparison.verdict, buyLeft: comparison.verdictBuyLeft, buyRight: comparison.verdictBuyRight });
    const evidence = parseVerdictEvidence(comparison.verdictEvidenceJson);
    if (!copy.headline || !copy.summary || !copy.buyLeft || !copy.buyRight || evidence.length < 2) return Response.json({ error: "Complete and save an evidence-backed verdict before approval." }, { status: 422 });
    if (comparison.verdictScoringVersion !== HEADPHONE_SCORING_VERSION) return Response.json({ error: "Scoring rules changed after this draft. Regenerate the verdict before approval." }, { status: 409 });
    if (comparison.verdictDataVersion !== comparisonDataVersion(left, right)) return Response.json({ error: "Product facts changed after this draft. Regenerate the verdict before approval." }, { status: 409 });
    await db.update(comparisons).set({ verdictStatus: "approved", verdictApprovedAt: now, updatedAt: now }).where(eq(comparisons.id, comparison.id));
    return Response.json({ status: "approved" });
  }

  if (payload.action === "reject") {
    await db.update(comparisons).set({ verdictStatus: "rejected", verdictApprovedAt: null, updatedAt: now }).where(eq(comparisons.id, comparison.id));
    return Response.json({ status: "rejected" });
  }

  return Response.json({ error: "Choose generate, save, approve, or reject." }, { status: 400 });
}
