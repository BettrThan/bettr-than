import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons, ingestionJobs } from "@/db/schema";
import { assertApprovedSource, slugify, type NormalizedFact } from "@/lib/agents/product-ingestion";
import { buildComparisonCandidates } from "@/lib/comparison-batch";
import { comparisonEligibilitySnapshot } from "@/lib/comparison-workflow";
import { comparisonPairKey } from "@/lib/comparison-discovery";
import { parseProductCsv, type CsvProductInput } from "@/lib/csv-product-import";
import {
  formatHeadphoneSpec,
  headphoneFields,
  sanitizeHeadphoneSpecs,
  sanitizeProductSpecProvenance,
  type CatalogHeadphone,
} from "@/lib/headphone-specs";
import topTenHeadphonesCsv from "@/tests/fixtures/top-10-headphones.csv?raw";

const LAUNCH_RETRIEVED_AT = "2026-09-05T00:00:00.000Z";

const identityText = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const productIdentity = (brand: string, name: string) => `${identityText(brand)}:${identityText(name)}`;

function sourceIdentity(value: string) {
  const source = new URL(value);
  source.hash = "";
  source.search = "";
  source.pathname = source.pathname.replace(/\/+$/, "") || "/";
  return source.toString().toLowerCase();
}

function factsFromSpecs(specs: ReturnType<typeof sanitizeHeadphoneSpecs>, sourceUrl: string): NormalizedFact[] {
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
      retrievedAt: LAUNCH_RETRIEVED_AT,
    }];
  });
}

function launchRows(): CsvProductInput[] {
  const rows = parseProductCsv(topTenHeadphonesCsv);
  const errors = rows.flatMap((row) => row.errors.map((error) => `${row.canonicalName}: ${error}`));
  if (rows.length !== 10 || errors.length > 0) {
    throw new Error(errors.length > 0 ? errors.join(" ") : `Expected 10 launch products; found ${rows.length}.`);
  }
  return rows;
}

export async function upsertTopTenHeadphones(actorId: string) {
  const rows = launchRows();
  const db = getDb();
  const [knownJobs, knownProducts] = await Promise.all([
    db.select({ id: ingestionJobs.id, sourceUrl: ingestionJobs.sourceUrl }).from(ingestionJobs),
    db.select().from(catalogProducts).where(eq(catalogProducts.categorySlug, "headphones")),
  ]);
  const jobsBySource = new Map(knownJobs.map((job) => [sourceIdentity(job.sourceUrl), job]));
  const productsByIdentity = new Map(knownProducts.map((product) => [productIdentity(product.brand, product.canonicalName), product]));
  const productsByJob = new Map(knownProducts.map((product) => [product.ingestionJobId, product]));
  const launchProductIds = new Set<string>();
  let imported = 0;
  let updated = 0;

  for (const row of rows) {
    const source = assertApprovedSource(row.sourceUrl);
    const sourceUrl = source.toString();
    const specs = sanitizeHeadphoneSpecs(row.specs);
    const facts = factsFromSpecs(specs, sourceUrl);
    const factsJson = JSON.stringify(facts);
    const specsJson = JSON.stringify(specs);
    const specProvenanceJson = JSON.stringify(sanitizeProductSpecProvenance({}, specs, {
      sourceUrl,
      retrievedAt: LAUNCH_RETRIEVED_AT,
      sourceType: "manufacturer",
    }));
    const jobBySource = jobsBySource.get(sourceIdentity(sourceUrl));
    const productByName = productsByIdentity.get(productIdentity(row.brand, row.canonicalName));
    const targetJobId = productByName?.ingestionJobId ?? jobBySource?.id ?? crypto.randomUUID();
    const existingProduct = productByName ?? productsByJob.get(targetJobId);
    const productId = existingProduct?.id ?? crypto.randomUUID();
    const slug = existingProduct?.slug ?? `${slugify(row.canonicalName)}-${targetJobId.slice(0, 8)}`;
    const reviewNotes = row.notes.slice(0, 500) || "Verified launch-catalog research.";
    const now = new Date().toISOString();

    if (jobBySource || productByName) {
      await db.update(ingestionJobs).set({
        submittedBy: actorId,
        sourceUrl,
        sourceHost: source.hostname,
        categorySlug: "headphones",
        status: "approved",
        canonicalName: row.canonicalName,
        brand: row.brand,
        imageUrl: row.imageUrl || null,
        description: row.description || null,
        normalizedJson: factsJson,
        specsJson,
        specProvenanceJson,
        specConflictsJson: "[]",
        conflictsJson: "[]",
        errorMessage: null,
        reviewNotes,
        reviewedAt: now,
        updatedAt: now,
      }).where(eq(ingestionJobs.id, targetJobId));
      updated += 1;
    } else {
      await db.insert(ingestionJobs).values({
        id: targetJobId,
        submittedBy: actorId,
        sourceUrl,
        sourceHost: source.hostname,
        categorySlug: "headphones",
        status: "approved",
        canonicalName: row.canonicalName,
        brand: row.brand,
        imageUrl: row.imageUrl || null,
        description: row.description || null,
        normalizedJson: factsJson,
        specsJson,
        specProvenanceJson,
        specConflictsJson: "[]",
        conflictsJson: "[]",
        reviewNotes,
        reviewedAt: now,
        updatedAt: now,
      });
      imported += 1;
    }

    await db.insert(catalogProducts).values({
      id: productId,
      ingestionJobId: targetJobId,
      slug,
      canonicalName: row.canonicalName,
      brand: row.brand,
      categorySlug: "headphones",
      sourceUrl,
      imageUrl: row.imageUrl || null,
      description: row.description || null,
      factsJson,
      specsJson,
      specProvenanceJson,
      specConflictsJson: "[]",
      status: "published",
    }).onConflictDoUpdate({
      target: catalogProducts.ingestionJobId,
      set: {
        canonicalName: row.canonicalName,
        brand: row.brand,
        categorySlug: "headphones",
        sourceUrl,
        imageUrl: row.imageUrl || null,
        description: row.description || null,
        factsJson,
        specsJson,
        specProvenanceJson,
        specConflictsJson: "[]",
        status: "published",
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

    launchProductIds.add(productId);
    const indexed = { ...existingProduct, id: productId, ingestionJobId: targetJobId, slug, canonicalName: row.canonicalName, brand: row.brand };
    jobsBySource.set(sourceIdentity(sourceUrl), { id: targetJobId, sourceUrl });
    productsByIdentity.set(productIdentity(row.brand, row.canonicalName), indexed as typeof knownProducts[number]);
    productsByJob.set(targetJobId, indexed as typeof knownProducts[number]);
  }

  let archived = 0;
  for (const product of knownProducts) {
    if (launchProductIds.has(product.id) || product.status !== "published") continue;
    await db.update(catalogProducts).set({ status: "archived", updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(catalogProducts.id, product.id));
    archived += 1;
  }

  const products = await db.select().from(catalogProducts).where(eq(catalogProducts.categorySlug, "headphones"));
  const published = products.filter((product) => product.status === "published" && launchProductIds.has(product.id));
  if (published.length !== 10) throw new Error(`Launch catalog validation failed: expected 10 published products; found ${published.length}.`);
  return { imported, updated, archived, products: published as CatalogHeadphone[] };
}

export async function publishAllEligibleHeadphoneComparisons(actorId: string, productsInput?: CatalogHeadphone[]) {
  const db = getDb();
  const products = productsInput ?? await db.select().from(catalogProducts).where(eq(catalogProducts.categorySlug, "headphones")) as CatalogHeadphone[];
  const publishedProducts = products.filter((product) => product.status === "published");
  const candidates = buildComparisonCandidates(publishedProducts);
  const existing = await db.select().from(comparisons).where(eq(comparisons.categorySlug, "headphones"));
  const byPair = new Map(existing.map((comparison) => [comparison.pairKey, comparison]));
  const publicProductIds = new Set(publishedProducts.map((product) => product.id));
  const now = new Date().toISOString();

  for (const comparison of existing) {
    if (publicProductIds.has(comparison.leftProductId) && publicProductIds.has(comparison.rightProductId)) continue;
    await db.update(comparisons).set({
      status: "needs_review",
      approvedAt: null,
      verdictStatus: "missing",
      verdictApprovedAt: null,
      updatedAt: now,
    }).where(eq(comparisons.id, comparison.id));
  }

  for (const candidate of candidates) {
    const pairKey = comparisonPairKey(candidate.left.id, candidate.right.id);
    const current = byPair.get(pairKey);
    const values = {
      slug: [candidate.left.slug, candidate.right.slug].sort().join("-vs-"),
      pairKey,
      categorySlug: "headphones",
      leftProductId: candidate.left.id,
      rightProductId: candidate.right.id,
      createdBy: current?.createdBy ?? actorId,
      status: "published",
      verdict: candidate.verdict.summary,
      verdictStatus: "approved",
      verdictHeadline: candidate.verdict.headline,
      verdictBuyLeft: candidate.verdict.buyLeft,
      verdictBuyRight: candidate.verdict.buyRight,
      verdictEvidenceJson: JSON.stringify(candidate.verdict.evidence),
      verdictPreset: candidate.verdict.preset,
      verdictScoringVersion: candidate.verdict.scoringVersion,
      verdictDataVersion: candidate.verdict.dataVersion,
      verdictDraftedAt: now,
      verdictApprovedAt: now,
      coveragePercent: candidate.coverage.coreCoveragePercent,
      scoringVersion: candidate.coverage.scoringVersion,
      eligibilityJson: comparisonEligibilitySnapshot(candidate.coverage),
      approvedAt: now,
      publishedAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: now,
    };
    if (current) {
      await db.update(comparisons).set(values).where(eq(comparisons.id, current.id));
    } else {
      await db.insert(comparisons).values({ id: crypto.randomUUID(), ...values });
    }
  }

  const expected = (publishedProducts.length * (publishedProducts.length - 1)) / 2;
  if (candidates.length !== expected) {
    throw new Error(`Comparison rollout validation failed: ${candidates.length} of ${expected} pairings were eligible.`);
  }
  return { products: publishedProducts.length, published: candidates.length, expected };
}

export async function launchTopTenCatalog(actorId: string) {
  const catalog = await upsertTopTenHeadphones(actorId);
  const comparisonRollout = await publishAllEligibleHeadphoneComparisons(actorId, catalog.products);
  return { ...catalog, comparisons: comparisonRollout };
}
