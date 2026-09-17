import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, ingestionJobs } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { slugify, type NormalizedFact } from "@/lib/agents/product-ingestion";
import {
  detectProductSpecConflicts,
  parseHeadphoneSpecs,
  parseProductSpecConflicts,
  provenanceValidationErrors,
  resolveProductSpecConflicts,
  sanitizeHeadphoneSpecs,
  sanitizeProductSpecProvenance,
} from "@/lib/headphone-specs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const payload = await request.json() as {
    decision?: "save" | "approve" | "reject";
    notes?: string;
    canonicalName?: string;
    brand?: string;
    imageUrl?: string;
    description?: string;
    facts?: NormalizedFact[];
    specs?: unknown;
    provenance?: unknown;
  };
  const db = getDb();
  const [job] = await db.select().from(ingestionJobs).where(eq(ingestionJobs.id, id)).limit(1);
  if (!job) return Response.json({ error: "Ingestion job not found." }, { status: 404 });
  if (!["failed", "review_required", "approved"].includes(job.status)) return Response.json({ error: "This job is not editable yet." }, { status: 409 });

  if (payload.decision === "reject") {
    if (job.status === "approved") return Response.json({ error: "Published products cannot be rejected here." }, { status: 409 });
    await db.update(ingestionJobs).set({ status: "rejected", reviewNotes: payload.notes?.slice(0, 500) ?? null, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(ingestionJobs.id, id));
    return Response.json({ status: "rejected" });
  }
  if (!["save", "approve"].includes(payload.decision ?? "")) return Response.json({ error: "Choose save, approve, or reject." }, { status: 400 });

  const canonicalName = (payload.canonicalName ?? job.canonicalName ?? "").trim().slice(0, 160);
  const brand = (payload.brand ?? job.brand ?? "").trim().slice(0, 80);
  const description = (payload.description ?? job.description ?? "").trim().slice(0, 600) || null;
  let imageUrl = (payload.imageUrl ?? job.imageUrl ?? "").trim().slice(0, 1000) || null;
  if (imageUrl) {
    try { if (new URL(imageUrl).protocol !== "https:") imageUrl = null; } catch { imageUrl = null; }
  }
  const specs = sanitizeHeadphoneSpecs(payload.specs);
  const facts = payload.facts ?? (() => { try { return JSON.parse(job.normalizedJson ?? "[]") as NormalizedFact[]; } catch { return []; } })();
  const now = new Date().toISOString();
  const provenanceErrors = provenanceValidationErrors(payload.provenance, specs, job.sourceUrl);
  if (provenanceErrors.length) return Response.json({ error: provenanceErrors.join(" ") }, { status: 400 });
  const provenance = sanitizeProductSpecProvenance(payload.provenance, specs, { sourceUrl: job.sourceUrl, retrievedAt: now, sourceType: "manufacturer" });
  const specsJson = JSON.stringify(specs);
  const provenanceJson = JSON.stringify(provenance);
  const [existingProduct] = await db.select().from(catalogProducts).where(eq(catalogProducts.ingestionJobId, id)).limit(1);

  if (payload.decision === "save" && job.status === "approved" && existingProduct) {
    const conflicts = detectProductSpecConflicts(parseHeadphoneSpecs(existingProduct.specsJson), specs, provenance, now);
    if (conflicts.length) {
      await db.update(ingestionJobs).set({
        status: "review_required",
        canonicalName: canonicalName || null,
        brand: brand || null,
        imageUrl,
        description,
        specsJson,
        specProvenanceJson: provenanceJson,
        specConflictsJson: JSON.stringify(conflicts),
        errorMessage: null,
        reviewNotes: payload.notes?.slice(0, 500) ?? job.reviewNotes,
        updatedAt: now,
      }).where(eq(ingestionJobs.id, id));
      return Response.json({ status: "review_required", requiresConfirmation: true, conflictCount: conflicts.length });
    }
  }

  if (payload.decision === "save" && job.status !== "approved") {
    await db.update(ingestionJobs).set({
      status: "review_required",
      canonicalName: canonicalName || null,
      brand: brand || null,
      imageUrl,
      description,
      specsJson,
      specProvenanceJson: provenanceJson,
      errorMessage: null,
      reviewNotes: payload.notes?.slice(0, 500) ?? job.reviewNotes,
      updatedAt: now,
    }).where(eq(ingestionJobs.id, id));
    return Response.json({ status: "review_required" });
  }

  if (!canonicalName || !brand) return Response.json({ error: "Product name and brand are required." }, { status: 400 });
  if (payload.decision === "approve" && !facts.length && Object.keys(specs).length < 3) return Response.json({ error: `Add at least three verified headphone specifications before publishing (${Object.keys(specs).length}/3 complete).` }, { status: 400 });
  const unverified = Object.entries(provenance).filter(([, entry]) => entry?.status !== "verified");
  if (payload.decision === "approve" && unverified.length) return Response.json({ error: "Resolve every specification marked Needs review or Conflict before publishing." }, { status: 400 });

  if (payload.decision === "save") {
    await db.batch([
      db.update(ingestionJobs).set({ status: "approved", canonicalName, brand, imageUrl, description, specsJson, specProvenanceJson: provenanceJson, errorMessage: null, reviewNotes: payload.notes?.slice(0, 500) ?? job.reviewNotes, updatedAt: now }).where(eq(ingestionJobs.id, id)),
      db.update(catalogProducts).set({ canonicalName, brand, imageUrl, description, specsJson, specProvenanceJson: provenanceJson, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(catalogProducts.ingestionJobId, id)),
    ]);
    return Response.json({ status: "approved" });
  }

  const slug = existingProduct?.slug ?? `${slugify(canonicalName)}-${id.slice(0, 8)}`;
  const acceptedConflicts = resolveProductSpecConflicts(parseProductSpecConflicts(job.specConflictsJson), "accepted");
  const conflictsJson = JSON.stringify(acceptedConflicts);
  await db.batch([
    db.insert(catalogProducts).values({
      id: existingProduct?.id ?? crypto.randomUUID(),
      ingestionJobId: id,
      slug,
      canonicalName,
      brand,
      categorySlug: job.categorySlug,
      sourceUrl: job.sourceUrl,
      imageUrl,
      description,
      factsJson: JSON.stringify(facts),
      specsJson,
      specProvenanceJson: provenanceJson,
      specConflictsJson: conflictsJson,
      status: "published",
    }).onConflictDoUpdate({ target: catalogProducts.ingestionJobId, set: { canonicalName, brand, categorySlug: job.categorySlug, sourceUrl: job.sourceUrl, imageUrl, description, factsJson: JSON.stringify(facts), specsJson, specProvenanceJson: provenanceJson, specConflictsJson: conflictsJson, status: "published", updatedAt: sql`CURRENT_TIMESTAMP` } }),
    db.update(ingestionJobs).set({ status: "approved", canonicalName, brand, imageUrl, description, normalizedJson: JSON.stringify(facts), specsJson, specProvenanceJson: provenanceJson, specConflictsJson: conflictsJson, errorMessage: null, reviewNotes: payload.notes?.slice(0, 500) ?? null, reviewedAt: now, updatedAt: now }).where(eq(ingestionJobs.id, id)),
  ]);
  return Response.json({ status: "approved", slug });
}
