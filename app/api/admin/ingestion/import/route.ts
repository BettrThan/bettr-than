import { eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons, ingestionJobs } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { assertApprovedSource, slugify, type NormalizedFact } from "@/lib/agents/product-ingestion";
import type { CsvProductInput } from "@/lib/csv-product-import";
import { formatHeadphoneSpec, headphoneFields, sanitizeHeadphoneSpecs, sanitizeProductSpecProvenance } from "@/lib/headphone-specs";
import { comparisonEligibilitySnapshot, getHeadphoneComparisonEligibility } from "@/lib/comparison-workflow";

type ImportPayload = { rows?: CsvProductInput[] };

const cleanText = (value: unknown, maxLength: number) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";

function normalizeImageUrl(value: unknown) {
  const imageUrl = cleanText(value, 1000);
  if (!imageUrl) return null;
  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== "https:") throw new Error();
    return parsed.toString();
  } catch {
    throw new Error("Image URL must use HTTPS.");
  }
}

const identityText = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const productIdentity = (brand: string, name: string) => `${identityText(brand)}:${identityText(name)}`;
function sourceIdentity(value: string) {
  const source = new URL(value);
  source.hash = "";
  source.search = "";
  source.pathname = source.pathname.replace(/\/+$/, "") || "/";
  return source.toString().toLowerCase();
}

function factsFromSpecs(specs: ReturnType<typeof sanitizeHeadphoneSpecs>, sourceUrl: string, retrievedAt: string): NormalizedFact[] {
  return headphoneFields.flatMap((field) => {
    const value = specs[field.key];
    if (!value) return [];
    return [{
      key: field.key,
      label: field.label,
      value: formatHeadphoneSpec(field.key, value),
      numericValue: field.kind === "number" && value !== "not_applicable" ? Number(value) : null,
      unit: field.unit ?? null,
      confidence: 0.98,
      sourceUrl,
      retrievedAt,
    }];
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 1_000_000) return Response.json({ error: "The import is larger than the 1 MB limit." }, { status: 413 });

  let payload: ImportPayload;
  try {
    payload = await request.json() as ImportPayload;
  } catch {
    return Response.json({ error: "The import request is not valid JSON." }, { status: 400 });
  }
  if (!Array.isArray(payload.rows) || payload.rows.length === 0) return Response.json({ error: "Choose a CSV containing at least one valid product." }, { status: 400 });
  if (payload.rows.length > 100) return Response.json({ error: "Import up to 100 products at a time." }, { status: 400 });

  const db = getDb();
  const [knownJobs, knownProducts] = await Promise.all([
    db.select({ id: ingestionJobs.id, sourceUrl: ingestionJobs.sourceUrl }).from(ingestionJobs),
    db.select({ id: catalogProducts.id, ingestionJobId: catalogProducts.ingestionJobId, slug: catalogProducts.slug, canonicalName: catalogProducts.canonicalName, brand: catalogProducts.brand }).from(catalogProducts).where(eq(catalogProducts.categorySlug, "headphones")),
  ]);
  const jobsBySource = new Map(knownJobs.map((job) => [sourceIdentity(job.sourceUrl), job]));
  const productsByIdentity = new Map(knownProducts.map((product) => [productIdentity(product.brand, product.canonicalName), product]));
  const productsByJob = new Map(knownProducts.map((product) => [product.ingestionJobId, product]));
  const errors: Array<{ rowNumber: number; product: string; error: string }> = [];
  const seenNames = new Set<string>();
  const touchedProductIds = new Set<string>();
  let imported = 0;
  let updated = 0;

  for (const rawRow of payload.rows) {
    const rowNumber = Number.isInteger(rawRow?.rowNumber) ? rawRow.rowNumber : 0;
    const canonicalName = cleanText(rawRow?.canonicalName, 160);
    const brand = cleanText(rawRow?.brand, 80);
    try {
      if (!canonicalName || !brand) throw new Error("Product name and brand are required.");
      const nameKey = canonicalName.toLowerCase();
      if (seenNames.has(nameKey)) throw new Error("Duplicate product name in this import.");
      seenNames.add(nameKey);

      const source = assertApprovedSource(cleanText(rawRow?.sourceUrl, 1000));
      const sourceUrl = source.toString();
      const imageUrl = normalizeImageUrl(rawRow?.imageUrl);
      const description = cleanText(rawRow?.description, 600) || null;
      const reviewNotes = cleanText(rawRow?.notes, 500) || null;
      const specs = sanitizeHeadphoneSpecs(rawRow?.specs);
      if (Object.keys(specs).length < 3) throw new Error(`Add at least three verified specifications (${Object.keys(specs).length}/3 complete).`);

      const now = new Date().toISOString();
      const facts = factsFromSpecs(specs, sourceUrl, now);
      const factsJson = JSON.stringify(facts);
      const specsJson = JSON.stringify(specs);
      const specProvenanceJson = JSON.stringify(sanitizeProductSpecProvenance({}, specs, { sourceUrl, retrievedAt: now, sourceType: "manufacturer" }));
      const jobBySource = jobsBySource.get(sourceIdentity(sourceUrl));
      const productByName = jobBySource ? undefined : productsByIdentity.get(productIdentity(brand, canonicalName));
      const targetJobId = jobBySource?.id ?? productByName?.ingestionJobId;

      if (targetJobId) {
        const existingProduct = productsByJob.get(targetJobId);
        const productId = existingProduct?.id ?? crypto.randomUUID();
        const slug = existingProduct?.slug ?? `${slugify(canonicalName)}-${targetJobId.slice(0, 8)}`;
        await db.batch([
          db.update(ingestionJobs).set({ submittedBy: auth.user.userId, sourceUrl, sourceHost: source.hostname, categorySlug: "headphones", status: "approved", canonicalName, brand, imageUrl, description, normalizedJson: factsJson, specsJson, specProvenanceJson, specConflictsJson: "[]", conflictsJson: "[]", errorMessage: null, reviewNotes, reviewedAt: now, updatedAt: now }).where(eq(ingestionJobs.id, targetJobId)),
          db.insert(catalogProducts).values({ id: productId, ingestionJobId: targetJobId, slug, canonicalName, brand, categorySlug: "headphones", sourceUrl, imageUrl, description, factsJson, specsJson, specProvenanceJson, specConflictsJson: "[]", status: "published" }).onConflictDoUpdate({ target: catalogProducts.ingestionJobId, set: { canonicalName, brand, categorySlug: "headphones", sourceUrl, imageUrl, description, factsJson, specsJson, specProvenanceJson, specConflictsJson: "[]", status: "published", updatedAt: sql`CURRENT_TIMESTAMP` } }),
        ]);
        touchedProductIds.add(productId);
        const indexed = { id: productId, ingestionJobId: targetJobId, slug, canonicalName, brand };
        jobsBySource.set(sourceIdentity(sourceUrl), { id: targetJobId, sourceUrl });
        productsByJob.set(targetJobId, indexed);
        productsByIdentity.set(productIdentity(brand, canonicalName), indexed);
        if (existingProduct) updated += 1; else imported += 1;
      } else {
        const jobId = crypto.randomUUID();
        const productId = crypto.randomUUID();
        const slug = `${slugify(canonicalName)}-${jobId.slice(0, 8)}`;
        await db.batch([
          db.insert(ingestionJobs).values({ id: jobId, submittedBy: auth.user.userId, sourceUrl, sourceHost: source.hostname, categorySlug: "headphones", status: "approved", canonicalName, brand, imageUrl, description, normalizedJson: factsJson, specsJson, specProvenanceJson, specConflictsJson: "[]", conflictsJson: "[]", reviewNotes, reviewedAt: now, updatedAt: now }),
          db.insert(catalogProducts).values({ id: productId, ingestionJobId: jobId, slug, canonicalName, brand, categorySlug: "headphones", sourceUrl, imageUrl, description, factsJson, specsJson, specProvenanceJson, specConflictsJson: "[]", status: "published" }),
        ]);
        touchedProductIds.add(productId);
        const indexed = { id: productId, ingestionJobId: jobId, slug, canonicalName, brand };
        jobsBySource.set(sourceIdentity(sourceUrl), { id: jobId, sourceUrl });
        productsByJob.set(jobId, indexed);
        productsByIdentity.set(productIdentity(brand, canonicalName), indexed);
        imported += 1;
      }
    } catch (error) {
      errors.push({ rowNumber, product: canonicalName || `Row ${rowNumber}`, error: error instanceof Error ? error.message : "Unable to import this row." });
    }
  }

  if (touchedProductIds.size > 0) {
    const touched = [...touchedProductIds];
    const affected = await db.select().from(comparisons).where(or(inArray(comparisons.leftProductId, touched), inArray(comparisons.rightProductId, touched)));
    if (affected.length > 0) {
      const productIds = [...new Set(affected.flatMap((comparison) => [comparison.leftProductId, comparison.rightProductId]))];
      const comparisonProducts = await db.select().from(catalogProducts).where(inArray(catalogProducts.id, productIds));
      const byId = new Map(comparisonProducts.map((product) => [product.id, product]));
      for (const comparison of affected) {
        const left = byId.get(comparison.leftProductId);
        const right = byId.get(comparison.rightProductId);
        if (!left || !right) continue;
        const eligibility = getHeadphoneComparisonEligibility(left, right);
        await db.update(comparisons).set({
          status: comparison.status === "draft" ? "draft" : "needs_review",
          coveragePercent: eligibility.coreCoveragePercent,
          scoringVersion: eligibility.scoringVersion,
          eligibilityJson: comparisonEligibilitySnapshot(eligibility),
          approvedAt: null,
          verdictStatus: "missing",
          verdictHeadline: null,
          verdict: null,
          verdictBuyLeft: null,
          verdictBuyRight: null,
          verdictEvidenceJson: "[]",
          verdictPreset: null,
          verdictScoringVersion: null,
          verdictDataVersion: null,
          verdictDraftedAt: null,
          verdictApprovedAt: null,
          updatedAt: new Date().toISOString(),
        }).where(eq(comparisons.id, comparison.id));
      }
    }
  }

  if (imported === 0 && updated === 0) return Response.json({ error: "No products were imported.", imported, updated, skipped: errors.length, errors }, { status: 400 });
  return Response.json({ imported, updated, skipped: errors.length, errors });
}
