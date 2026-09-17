import { ComparisonPageSelector } from "@/components/comparison-page-selector";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SmartphoneComparisonExperience } from "@/components/smartphone-comparison-experience";
import { DecisionAnalyticsView } from "@/components/decision-analytics-view";
import { getSmartphoneComparison } from "@/lib/smartphone-queries";
import { getPublicOffers } from "@/lib/offer-queries";
import { comparisonJsonLd,serializeJsonLd } from "@/lib/seo";
export const dynamic="force-dynamic";
type Props={params:Promise<{comparison:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata> {
  const found=await getSmartphoneComparison((await params).comparison).catch(()=>null);
  if(!found)return {title:"Comparison unavailable",robots:{index:false,follow:false}};
  const title=`${found.left.canonicalName} vs ${found.right.canonicalName}`;
  return {title,description:"Compare manufacturer specifications, reference prices, and practical trade-offs.",alternates:{canonical:`/compare/smartphones/${found.record.slug}`},robots:{index:Object.keys(await searchParams).length===0,follow:true}};
}
export default async function SmartphoneComparisonPage({params}:Props) {
  let found:Awaited<ReturnType<typeof getSmartphoneComparison>>;
  try { found=await getSmartphoneComparison((await params).comparison); } catch(error) { console.error("Phone comparison unavailable",error);return <main><SiteHeader/><div role="status" className="mx-auto max-w-4xl p-8"><h1 className="text-3xl font-black">Comparison temporarily unavailable</h1><p className="mt-4">Please refresh in a moment.</p></div></main>; }
  if(!found)notFound();const {record,left,right,collection}=found;
  const offers=await getPublicOffers([left.id,right.id]).catch(()=>new Map());
  const related=collection.comparisons.filter((c)=>c.id!==record.id && [c.leftProductId,c.rightProductId].some((id)=>id===left.id||id===right.id)).slice(0,6);
  return <main className="min-h-screen"><SiteHeader/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(comparisonJsonLd(record.slug,left,right))}}/><DecisionAnalyticsView eventName="comparison_viewed" details={{categorySlug:"smartphones",comparisonSlug:record.slug,productIds:[left.id,right.id]}}/><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><Link href="/category/smartphones" className="text-link">Smartphones</Link><ComparisonPageSelector category="smartphones" leftId={left.id} rightId={right.id} collection={collection} /><SmartphoneComparisonExperience left={left} right={right} comparisonSlug={record.slug} offers={{left:offers.get(left.id)??[],right:offers.get(right.id)??[]}}/><section className="mt-10"><h2 className="text-2xl font-black">Keep comparing</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{related.map((c)=><Link key={c.id} href={`/compare/smartphones/${c.slug}`} className="rounded-xl border border-white/10 p-4 text-cyan-200">{collection.products.find((p)=>p.id===c.leftProductId)?.canonicalName} vs {collection.products.find((p)=>p.id===c.rightProductId)?.canonicalName}</Link>)}</div></section></div></main>;
}
