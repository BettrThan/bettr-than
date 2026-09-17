import { LaunchReadiness } from "@/components/launch-readiness";
import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, BarChart3, LockKeyhole, Store } from "lucide-react";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { ComparisonBuilder } from "@/components/comparison-builder";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { isAdminUser } from "@/lib/admin-auth";
import { HEADPHONE_SCORING_VERSION, getHeadphonePairCoverageForProducts, getHeadphoneProductReadiness, type CatalogHeadphone } from "@/lib/headphone-specs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comparison Builder", robots: { index: false, follow: false } };

export default async function ComparisonBuilderPage() {
  const user = await requireChatGPTUser("/admin/comparisons");
  if (!(await isAdminUser(user))) notFound();
  let products: Array<{ id: string; slug: string; canonicalName: string; brand: string; sourceUrl: string; imageUrl: string | null; description: string | null; status: string; specsJson: string; specProvenanceJson: string }> = [];
  let existingComparisons: Array<{ id: string; slug: string; leftProductId: string; rightProductId: string; status: string; coveragePercent: number; scoringVersion: string; verdictStatus: string; verdictHeadline: string | null; verdict: string | null; verdictBuyLeft: string | null; verdictBuyRight: string | null; verdictEvidenceJson: string; verdictPreset: string | null; verdictScoringVersion: string | null }> = [];
  let dataUnavailable = false;
  try {
    [products, existingComparisons] = await Promise.all([
      getDb().select({ id: catalogProducts.id, slug: catalogProducts.slug, canonicalName: catalogProducts.canonicalName, brand: catalogProducts.brand, sourceUrl: catalogProducts.sourceUrl, imageUrl: catalogProducts.imageUrl, description: catalogProducts.description, status: catalogProducts.status, specsJson: catalogProducts.specsJson, specProvenanceJson: catalogProducts.specProvenanceJson }).from(catalogProducts).where(and(eq(catalogProducts.categorySlug, "headphones"), eq(catalogProducts.status, "published"))).orderBy(asc(catalogProducts.canonicalName)),
      getDb().select({ id: comparisons.id, slug: comparisons.slug, leftProductId: comparisons.leftProductId, rightProductId: comparisons.rightProductId, status: comparisons.status, coveragePercent: comparisons.coveragePercent, scoringVersion: comparisons.scoringVersion, verdictStatus: comparisons.verdictStatus, verdictHeadline: comparisons.verdictHeadline, verdict: comparisons.verdict, verdictBuyLeft: comparisons.verdictBuyLeft, verdictBuyRight: comparisons.verdictBuyRight, verdictEvidenceJson: comparisons.verdictEvidenceJson, verdictPreset: comparisons.verdictPreset, verdictScoringVersion: comparisons.verdictScoringVersion }).from(comparisons).where(eq(comparisons.categorySlug, "headphones")).orderBy(desc(comparisons.publishedAt)),
    ]);
  } catch {
    dataUnavailable = true;
  }
  const productsById = new Map(products.map((product) => [product.id, product]));
  existingComparisons = existingComparisons.map((comparison) => {
    const left = productsById.get(comparison.leftProductId);
    const right = productsById.get(comparison.rightProductId);
    if (!left || !right || comparison.coveragePercent > 0) return comparison;
    return {
      ...comparison,
      coveragePercent: getHeadphonePairCoverageForProducts(left as CatalogHeadphone, right as CatalogHeadphone).coreCoveragePercent,
      scoringVersion: comparison.scoringVersion === "headphones-v1-legacy" ? HEADPHONE_SCORING_VERSION : comparison.scoringVersion,
    };
  });
  const productOptions = products.map((product) => ({ ...product, ...getHeadphoneProductReadiness(product as CatalogHeadphone) }));
  return <main className="min-h-screen"><SiteHeader /><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/ingestion" className="text-link"><ArrowLeft className="h-4 w-4" /> Product Agent Console</Link><div className="flex gap-2"><Link href="/admin/offers" className="text-link rounded-xl border border-white/10 px-4 py-2"><Store className="h-4 w-4" /> Retailer offers</Link><Link href="/admin/analytics" className="text-link rounded-xl border border-white/10 px-4 py-2"><BarChart3 className="h-4 w-4" /> Analytics</Link></div></div><div className="my-5 flex flex-wrap gap-4"><Link href="/admin/research" className="text-link">Research batches &amp; Smartphones</Link><Link href="/category/smartphones" className="text-link">Smartphones catalog</Link></div><header className="mt-9 mb-10"><p className="section-kicker"><LockKeyhole className="mr-2 inline h-4 w-4" />Owner-only workspace</p><h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl">Headphones comparison builder</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">Review product readiness, choose a strong matchup, and publish a comparison based only on specifications verified for both products.</p></header><LaunchReadiness/>{dataUnavailable ? <div className="rounded-3xl border border-amber-300/20 bg-amber-300/5 p-8"><h2 className="text-xl font-black text-white">Comparison data is temporarily unavailable</h2><p className="mt-2 text-slate-400">Refresh the page in a moment. Your catalog data has not been changed.</p></div> : <ComparisonBuilder products={productOptions} existingComparisons={existingComparisons} />}</div></main>;
}
