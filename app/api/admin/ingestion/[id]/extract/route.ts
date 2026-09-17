import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { ingestionJobs } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { extractCandidate, fetchApprovedHtml, type NormalizedFact } from "@/lib/agents/product-ingestion";
import { inferHeadphoneSpecs, parseHeadphoneSpecs, parseProductSpecProvenance, sanitizeProductSpecProvenance } from "@/lib/headphone-specs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const { id } = await params; const db = getDb();
  const [job] = await db.select().from(ingestionJobs).where(eq(ingestionJobs.id, id)).limit(1);
  if (!job) return Response.json({ error: "Ingestion job not found." }, { status: 404 });
  if (!["queued", "failed", "review_required"].includes(job.status)) return Response.json({ error: "This job can no longer be extracted." }, { status: 409 });
  await db.update(ingestionJobs).set({ status: "extracting", errorMessage: null, updatedAt: new Date().toISOString() }).where(eq(ingestionJobs.id, id));
  try {
    const source = await fetchApprovedHtml(job.sourceUrl); const candidate = extractCandidate(source.html, source.finalUrl);
    if (source.truncated) candidate.conflicts.push("This large manufacturer page was safely truncated after 4 MB. Verify the extracted facts before approval.");
    const previous = candidate.canonicalName ? await db.select({ normalizedJson: ingestionJobs.normalizedJson }).from(ingestionJobs).where(and(eq(ingestionJobs.canonicalName, candidate.canonicalName), ne(ingestionJobs.id, id))).limit(5) : [];
    const priorFacts = previous.flatMap((row) => { try { return JSON.parse(row.normalizedJson ?? "[]") as NormalizedFact[]; } catch { return []; } });
    const priorByKey = new Map(priorFacts.map((fact) => [fact.key, fact.value]));
    for (const fact of candidate.facts) { const prior = priorByKey.get(fact.key); if (prior && prior.toLowerCase() !== fact.value.toLowerCase()) candidate.conflicts.push(`${fact.label}: current source says “${fact.value}”; an earlier extraction says “${prior}”`); }
    const inferredSpecs = job.categorySlug === "headphones" ? inferHeadphoneSpecs(candidate.facts) : {};
    const specs = { ...inferredSpecs, ...parseHeadphoneSpecs(job.specsJson) };
    const now = new Date().toISOString();
    const provenance = sanitizeProductSpecProvenance(parseProductSpecProvenance(job.specProvenanceJson), specs, { sourceUrl: source.finalUrl, retrievedAt: now, sourceType: "manufacturer" });
    await db.update(ingestionJobs).set({ status: "review_required", sourceUrl: source.finalUrl, canonicalName: candidate.canonicalName, brand: candidate.brand, imageUrl: candidate.imageUrl, description: candidate.description, extractedJson: JSON.stringify(candidate), normalizedJson: JSON.stringify(candidate.facts), specsJson: JSON.stringify(specs), specProvenanceJson: JSON.stringify(provenance), conflictsJson: JSON.stringify(candidate.conflicts), errorMessage: null, updatedAt: now }).where(eq(ingestionJobs.id, id));
    return Response.json({ candidate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed.";
    await db.update(ingestionJobs).set({ status: "failed", errorMessage: message, updatedAt: new Date().toISOString() }).where(eq(ingestionJobs.id, id));
    return Response.json({ error: message }, { status: 422 });
  }
}
