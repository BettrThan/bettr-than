import { z } from "zod";
import { comparisonPairKey } from "@/lib/comparison-pair";
import { smartphoneSpecSchema, scoreSmartphoneComparison, draftSmartphoneVerdict, SMARTPHONE_SCORING_VERSION, smartphoneDataVersion } from "@/lib/smartphone-specs";
import { sanitizeHeadphoneSpecs, HEADPHONE_SCORING_VERSION } from "@/lib/headphone-specs";
import { draftComparisonVerdict, comparisonDataVersion } from "@/lib/verdicts";
import { getHeadphoneComparisonEligibility } from "@/lib/comparison-workflow";
import { approvedManufacturerDomains } from "@/lib/agents/product-ingestion";
import { draftExtendedVerdict, extendedCategoryModels, extendedDataVersion, isExtendedCategory, scoreExtendedComparison, validateExtendedSpecs } from "@/lib/extended-category-specs";
const httpsUrl = z.string().url().max(1500).refine((value) => { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }, "Use an HTTPS URL without credentials.");
const officialUrl = httpsUrl.refine((value) => [...approvedManufacturerDomains, "store.google.com", "blog.google", "samsungmobilepress.com"].some((host) => new URL(value).hostname === host || new URL(value).hostname.endsWith(`.${host}`)), "Use an approved manufacturer source.");
const timestamp = z.string().datetime().refine((value) => Date.parse(value) <= Date.now() + 60000, "Research dates cannot be in the future.");
const productSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  canonicalName: z.string().min(2).max(160), brand: z.string().min(1).max(80),
  sourceUrl: officialUrl, imageUrl: httpsUrl.nullable(), description: z.string().min(10).max(600),
  region: z.string().min(2).max(100), configuration: z.string().min(2).max(160),
  notes: z.string().max(2000), priceBasis: z.enum(["launch_msrp", "reference_price"]).default("reference_price"),
  retrievedAt: timestamp, specs: z.record(z.union([z.string().max(160), z.number().finite(), z.boolean()])),
  fieldSources: z.record(z.object({
    sourceUrl: officialUrl, retrievedAt: timestamp, notes: z.string().max(500).optional()
  }).strict()),
}).strict();
export const researchBatchSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,100}$/),
  title: z.string().min(3).max(180), category: z.enum(["headphones", "smartphones", "portable-speakers", "vr-headsets", "wearables", "game-consoles"]),
  researchedAt: timestamp, products: z.array(productSchema).min(1).max(20),
}).strict();
export type ResearchBatch = z.infer<typeof researchBatchSchema>;
export type ResearchProduct = ResearchBatch["products"][number];
export function validateResearchBatch(input: unknown): ResearchBatch {
  const batch = researchBatchSchema.parse(input);
  const names = new Set<string>();
  const slugs = new Set<string>();
  for (const p of batch.products) {
    const identity = `${p.brand}:${p.canonicalName}`.toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9]/g, "");
    if (names.has(identity) || slugs.has(p.slug))
      throw new Error("Duplicate products in the research batch.");
    names.add(identity);
    slugs.add(p.slug);
    if (batch.category === "smartphones")
      p.specs = smartphoneSpecSchema.parse(p.specs);
    else if (isExtendedCategory(batch.category))
      p.specs = validateExtendedSpecs(batch.category, p.specs);
    else {
      const clean = sanitizeHeadphoneSpecs(p.specs);
      if (Object.keys(clean).length !== Object.keys(p.specs).length)
        throw new Error(`${p.canonicalName}: unsupported headphone fields or values.`);
      p.specs = clean;
    }
    if (Object.keys(p.specs).length < 3)
      throw new Error(`${p.canonicalName}: at least three sourced specifications are required.`);
    for (const key of Object.keys(p.specs))
      if (!p.fieldSources[key])
        throw new Error(`${p.canonicalName}: ${key} is missing its source and research date.`);
    if (p.specs.price_usd !== undefined && p.priceBasis === "launch_msrp" && !p.fieldSources.price_usd.notes)
      throw new Error("Launch prices require a dated price note.");
  }
  return batch;
}
export function researchCatalogProduct(p: ResearchProduct, category: ResearchBatch["category"], updatedAt: string, existing?: {
  id: string;
  slug: string;
  ingestionJobId: string;
}) {
  const provenance = Object.fromEntries(Object.entries(p.specs).map(([key, value]) => [key, {
    value: String(value), sourceType: "manufacturer", status: "verified", confidence: .98, ...p.fieldSources[key]
  }]));
  return {
    id: existing?.id ?? `research-${category}-${p.slug}`, ingestionJobId: existing?.ingestionJobId ?? `research-job-${category}-${p.slug}`,
    slug: existing?.slug ?? p.slug, canonicalName: p.canonicalName, brand: p.brand, categorySlug: category, sourceUrl: p.sourceUrl, imageUrl: p.imageUrl,
    description: p.description, status: "published", publishedAt: updatedAt, updatedAt, specsJson: JSON.stringify(p.specs), specProvenanceJson: JSON.stringify(provenance), specConflictsJson: "[]",
    factsJson: JSON.stringify([{
      key: "configuration", label: "Compared configuration", value: `${p.region} · ${p.configuration}`
    }, {
      key: "research_notes", label: "Research notes", value: p.notes
    }, {
      key: "price_basis", label: "Price basis", value: p.priceBasis === "launch_msrp" ? "Launch MSRP; not a current retailer offer" : "Reference price at research date"
    }]),
  };
}
export function researchComparisons(products: Array<Omit<ReturnType<typeof researchCatalogProduct>, "categorySlug" | "description"> & {
  categorySlug: string;
  description: string | null;
}>, category: ResearchBatch["category"], now: string) {
  const result = [];
  for (let i = 0; i < products.length; i++)
    for (let j = i + 1; j < products.length; j++) {
      const left = products[i], right = products[j];
      const phone = category === "smartphones";
      const extended = isExtendedCategory(category);
      const coverage = phone ? scoreSmartphoneComparison(left, right) : extended ? scoreExtendedComparison(category, left, right) : getHeadphoneComparisonEligibility(left, right);
      if (!coverage.eligible)
        continue;
      const verdict = phone ? draftSmartphoneVerdict(left, right) : extended ? draftExtendedVerdict(category, left, right) : draftComparisonVerdict(left, right).draft;
      if (!verdict)
        continue;
      const pairKey = comparisonPairKey(left.id, right.id);
      const scoringVersion = phone ? SMARTPHONE_SCORING_VERSION : extended ? extendedCategoryModels[category].scoringVersion : HEADPHONE_SCORING_VERSION;
      const dataVersion = phone ? smartphoneDataVersion(left, right) : extended ? extendedDataVersion(category, left, right) : comparisonDataVersion(left, right);
      const coveragePercent = phone || extended ? (coverage as ReturnType<typeof scoreSmartphoneComparison>).coveragePercent : (coverage as ReturnType<typeof getHeadphoneComparisonEligibility>).coreCoveragePercent;
      result.push({
        id: `research-comparison-${left.id}-${right.id}`, slug: [left.slug, right.slug].sort().join("-vs-"), pairKey, categorySlug: category, leftProductId: left.id, rightProductId: right.id, status: "published", createdBy: "research", verdict: verdict.summary, verdictStatus: "approved", verdictHeadline: verdict.headline, verdictBuyLeft: verdict.buyLeft, verdictBuyRight: verdict.buyRight, verdictEvidenceJson: JSON.stringify(verdict.evidence), verdictPreset: "balanced", verdictScoringVersion: scoringVersion, verdictDataVersion: dataVersion, verdictDraftedAt: now, verdictApprovedAt: now, coveragePercent, scoringVersion, eligibilityJson: JSON.stringify(coverage), approvedAt: now, publishedAt: now, updatedAt: now
      });
    }
  return result;
}
export async function researchDigest(batch: ResearchBatch) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(batch)));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
