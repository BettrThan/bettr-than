import { ComparisonPageSelector } from "@/components/comparison-page-selector";
import { RelatedComparisons } from "@/components/related-comparisons";
import { getRelatedHeadphoneComparisons } from "@/lib/related-comparisons";
import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { HeadphoneComparisonExperience } from "@/components/headphone-comparison-experience";
import { DecisionAnalyticsView } from "@/components/decision-analytics-view";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";
import { HEADPHONE_SCORING_VERSION } from "@/lib/headphone-specs";
import { getPublicOffers } from "@/lib/offer-queries";
import type { PublicOffer } from "@/lib/offers";
import { comparisonJsonLd, safePublicImage, serializeJsonLd } from "@/lib/seo";
import { comparisonDataVersion } from "@/lib/verdicts";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ comparison: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function getComparison(slug: string) {
  const db = getDb();
  const [record] = await db.select().from(comparisons).where(eq(comparisons.slug, slug)).limit(1);
  if (!record || record.categorySlug !== "headphones" || record.status !== "published") return null;
  const [left] = await db.select().from(catalogProducts).where(and(eq(catalogProducts.id, record.leftProductId), eq(catalogProducts.status, "published"))).limit(1);
  const [right] = await db.select().from(catalogProducts).where(and(eq(catalogProducts.id, record.rightProductId), eq(catalogProducts.status, "published"))).limit(1);
  return left && right && isCurrentPublicComparison(record, left, right) ? { record, left, right } : null;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const found = await getComparison((await params).comparison);
  const hasSearchState = Object.keys(await searchParams).length > 0;
  const currentVerdict = found && found.record.verdictStatus === "approved" && found.record.verdictScoringVersion === HEADPHONE_SCORING_VERSION && found.record.verdictDataVersion === comparisonDataVersion(found.left, found.right);
  if (!found) return { title: "Comparison not found", robots: { index: false, follow: false } };
  const title = `${found.left.canonicalName} vs ${found.right.canonicalName}`;
  const description = `Compare verified Headphones specifications, use-case scores, editorial guidance, and community preference for ${found.left.canonicalName} and ${found.right.canonicalName}.`;
  const canonical = `/compare/headphones/${found.record.slug}`;
  const image = safePublicImage(found.left.imageUrl) ?? safePublicImage(found.right.imageUrl);
  return { title, description, alternates: { canonical }, robots: currentVerdict && !hasSearchState ? { index: true, follow: true } : { index: false, follow: true }, openGraph: { type: "website", url: canonical, title, description, images: image ? [{ url: image, alt: title }] : undefined }, twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined } };
}

export default async function HeadphonesComparisonPage({ params }: PageProps) {
  const { comparison } = await params;
  const found = await getComparison(comparison);
  if (!found) notFound();
  const { record, left, right } = found;
  const verdictCurrent = record.verdictScoringVersion === HEADPHONE_SCORING_VERSION && record.verdictDataVersion === comparisonDataVersion(left, right);
  const verdict = verdictCurrent && record.verdictStatus === "approved" && record.verdictHeadline && record.verdict && record.verdictBuyLeft && record.verdictBuyRight
    ? { headline: record.verdictHeadline, summary: record.verdict, buyLeft: record.verdictBuyLeft, buyRight: record.verdictBuyRight, preset: record.verdictPreset, scoringVersion: record.verdictScoringVersion, evidenceJson: record.verdictEvidenceJson }
    : null;
  let offersByProduct = new Map<string, PublicOffer[]>();
  try { offersByProduct = await getPublicOffers([left.id, right.id]); } catch {}
  const related = await getRelatedHeadphoneComparisons([left.id, right.id], record.id).catch(() => []);
  const offers = { left: offersByProduct.get(left.id) ?? [], right: offersByProduct.get(right.id) ?? [] };
  return <main className="min-h-screen"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(comparisonJsonLd(record.slug, left, right)) }} /><DecisionAnalyticsView eventName="comparison_viewed" details={{ categorySlug: "headphones", comparisonSlug: record.slug, productIds: [left.id, right.id] }} /><SiteHeader /><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><Link href="/category/headphones" className="text-link"><ArrowLeft className="h-4 w-4" /> Headphones</Link><ComparisonPageSelector category="headphones" leftId={left.id} rightId={right.id} /><HeadphoneComparisonExperience comparisonSlug={record.slug} left={left} right={right} verdict={verdict} offers={offers} /><RelatedComparisons comparisons={related} /></div></main>;
}
