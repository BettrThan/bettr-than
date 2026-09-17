import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons, ingestionJobs, researchBatches, researchPublications } from "@/db/schema";
import { researchCatalogProduct, researchComparisons, researchDigest, validateResearchBatch, type ResearchBatch } from "@/lib/research-contract";
const identity = (p: {
  brand: string;
  canonicalName: string;
}) => `${p.brand}:${p.canonicalName}`.toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9]/g, "");
export async function listResearchBatches() { return getDb().select().from(researchBatches).orderBy(desc(researchBatches.uploadedAt)).limit(50); }
export async function uploadResearchBatch(input: unknown, actor: string) {
  const batch = validateResearchBatch(input);
  const digest = await researchDigest(batch);
  const db = getDb();
  const [existing] = await db.select().from(researchBatches).where(eq(researchBatches.id, batch.id)).limit(1);
  if (existing) {
    if (existing.digest !== digest)
      throw new Error("This batch ID already contains different research. Upload revisions with a new batch ID.");
    return {
      id: existing.id, status: existing.status, duplicate: true
    };
  }
  const current = await db.select().from(catalogProducts).where(eq(catalogProducts.categorySlug, batch.category));
  const baseline = Object.fromEntries(current.filter((p) => batch.products.some((n) => identity(n) === identity(p))).map((p) => [p.id, p.updatedAt]));
  await db.insert(researchBatches).values({
    id: batch.id, digest, title: batch.title, categorySlug: batch.category, payloadJson: JSON.stringify(batch), baselineJson: JSON.stringify(baseline), status: "pending", uploadedBy: actor, uploadedAt: new Date().toISOString()
  }).onConflictDoNothing();
  const [stored] = await db.select().from(researchBatches).where(eq(researchBatches.id, batch.id)).limit(1);
  if (stored.digest !== digest)
    throw new Error("This batch ID was used by another upload. Use a new batch ID.");
  return {
    id: batch.id, status: "pending", duplicate: false
  };
}
export async function prepareResearchBatch(batch: ResearchBatch, now: string) {
  const current = await getDb().select().from(catalogProducts).where(eq(catalogProducts.categorySlug, batch.category));
  const byIdentity = new Map(current.map((p) => [identity(p), p]));
  const products = batch.products.map((p) => {
    const existing = byIdentity.get(identity(p));
    if (current.some((row) => row.slug === p.slug && row.id !== existing?.id))
      throw new Error(`The slug ${p.slug} belongs to a different catalog product.`);
    const candidate = researchCatalogProduct(p, batch.category, now, existing);
    if (existing) {
      // An unstated value in a new research run never erases an existing fact.
      candidate.specsJson = JSON.stringify({
        ...JSON.parse(existing.specsJson), ...JSON.parse(candidate.specsJson)
      });
      candidate.specProvenanceJson = JSON.stringify({
        ...JSON.parse(existing.specProvenanceJson), ...JSON.parse(candidate.specProvenanceJson)
      });
      candidate.imageUrl = p.imageUrl ?? existing.imageUrl;
    }
    return candidate;
  });
  return {
    products, current, pairs: researchComparisons(products, batch.category, now)
  };
}
export async function publishResearchBatch(id: string, digest: string, actor: string) {
  const db = getDb();
  const [record] = await db.select().from(researchBatches).where(eq(researchBatches.id, id)).limit(1);
  if (!record || record.digest !== digest)
    throw new Error("The batch changed. Reload before approving publication.");
  if (record.status === "published")
    return {
      published: true, duplicate: true
    };
  if (record.status !== "pending")
    throw new Error("Only a pending research batch can be published.");
  const batch = validateResearchBatch(JSON.parse(record.payloadJson));
  const now = new Date().toISOString();
  const { products, current } = await prepareResearchBatch(batch, now);
  const baseline = JSON.parse(record.baselineJson) as Record<string, string>;
  const touchedIds = new Set(products.map((p) => p.id));
  for (const previous of current.filter((p) => touchedIds.has(p.id)))
    if (baseline[previous.id] !== previous.updatedAt)
      throw new Error(`${previous.canonicalName} changed after this research was uploaded. Upload a fresh batch to preserve those edits.`);
  const allProducts = [...current.filter((p) => p.status === "published" && !touchedIds.has(p.id)), ...products];
  const pairs = researchComparisons(allProducts, batch.category, now).filter((p) => touchedIds.has(p.leftProductId) || touchedIds.has(p.rightProductId));
  const existingPairs = await db.select().from(comparisons).where(eq(comparisons.categorySlug, batch.category));
  const pairByKey = new Map(existingPairs.map((p) => [p.pairKey, p]));
  // This first write runs inside the same transaction as the publication. A rejected,
  // already-published, or stale batch fails its CHECK and rolls the whole transaction back.
  const statements: Parameters<typeof db.batch>[0][number][] = [db.insert(researchPublications).values({
    batchId: id, approvedBy: actor, approvedAt: now, accepted: sql`CASE WHEN EXISTS (SELECT 1 FROM research_batches WHERE id = ${id} AND digest = ${digest} AND status = 'pending') AND NOT EXISTS (SELECT 1 FROM catalog_products WHERE id IN (${sql.join([...touchedIds].map((value) => sql`${value}`), sql`, `)}) AND COALESCE(json_extract(${record.baselineJson}, '$."' || id || '"'), '') <> updated_at) THEN 1 ELSE 0 END`
  })];
  for (const p of products) {
    statements.push(db.insert(ingestionJobs).values({
      id: p.ingestionJobId, submittedBy: actor, sourceUrl: p.sourceUrl, sourceHost: new URL(p.sourceUrl).hostname, categorySlug: batch.category, status: "approved", canonicalName: p.canonicalName, brand: p.brand, imageUrl: p.imageUrl, description: p.description, normalizedJson: p.factsJson, specsJson: p.specsJson, specProvenanceJson: p.specProvenanceJson, reviewNotes: `Research batch ${id}`, reviewedAt: now, updatedAt: now
    }).onConflictDoUpdate({
      target: ingestionJobs.id, set: {
        status: "approved", sourceUrl: p.sourceUrl, sourceHost: new URL(p.sourceUrl).hostname, canonicalName: p.canonicalName, brand: p.brand, imageUrl: p.imageUrl, description: p.description, normalizedJson: p.factsJson, specsJson: p.specsJson, specProvenanceJson: p.specProvenanceJson, reviewNotes: `Research batch ${id}`, reviewedAt: now, updatedAt: now
      }
    }));
    statements.push(db.insert(catalogProducts).values(p).onConflictDoUpdate({
      target: catalogProducts.id, set: {
        ...p, publishedAt: current.find((old) => old.id === p.id)?.publishedAt ?? now
      }
    }));
  }
  let publishedComparisons = 0;
  for (const pair of pairs) {
    const old = pairByKey.get(pair.pairKey);
    if (old?.status === "archived")
      continue;
    // Preserve established URL and voting identity when refreshing an existing comparison.
    if (old && old.leftProductId !== pair.leftProductId) {
      const regenerated = researchComparisons([allProducts.find((p) => p.id === old.leftProductId)!, allProducts.find((p) => p.id === old.rightProductId)!], batch.category, now)[0];
      if (regenerated)
        Object.assign(pair, regenerated);
    }
    const values = {
      ...pair, id: old?.id ?? pair.id, slug: old?.slug ?? pair.slug, createdBy: actor
    };
    statements.push(db.insert(comparisons).values(values).onConflictDoUpdate({
      target: comparisons.pairKey, set: values
    }));
    publishedComparisons++;
  }
  // Ineligible old verdicts cannot remain visible after their facts change.
  const refreshed = new Set(pairs.map((p) => p.pairKey));
  const stale = existingPairs.filter((p) => (touchedIds.has(p.leftProductId) || touchedIds.has(p.rightProductId)) && !refreshed.has(p.pairKey) && p.status !== "archived");
  for (const p of stale)
    statements.push(db.update(comparisons).set({
      status: "needs_review", verdictStatus: "missing", updatedAt: now
    }).where(eq(comparisons.id, p.id)));
  statements.push(db.update(researchBatches).set({
    status: "published", publishedAt: now, publishedBy: actor
  }).where(and(eq(researchBatches.id, id), eq(researchBatches.status, "pending"))));
  // D1 batch executes the complete catalog+comparison release transactionally.
  await db.batch([statements[0], ...statements.slice(1)]);
  return {
    published: true, products: products.length, comparisons: publishedComparisons
  };
}
