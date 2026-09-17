import { sortHeadphoneComparisons } from "@/lib/launch-plan";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ArrowRight, CheckCircle2, Database, Scale, Users } from "lucide-react";
import { CategoryCard } from "@/components/category-card";
import { HomeComparisonSwitcher } from "@/components/home-comparison-switcher";
import { SiteHeader } from "@/components/site-header";
import { UseCaseDiscovery } from "@/components/use-case-discovery";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { categories } from "@/lib/categories";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";
import { getHeadphonePairCoverageForProducts } from "@/lib/headphone-specs";
import { getSmartphoneCollection } from "@/lib/smartphone-queries";
import { getExtendedCategoryCollection } from "@/lib/extended-category-queries";
import type { ExtendedCategorySlug } from "@/lib/extended-category-specs";

export const dynamic = "force-dynamic";

export default async function Home() {
  let headphoneProducts: Array<typeof catalogProducts.$inferSelect> = [];
  let publishedComparisons: Array<typeof comparisons.$inferSelect> = [];
  let comparisonDataUnavailable = false;
  let smartphoneProducts: Array<typeof catalogProducts.$inferSelect> = [];
  let smartphoneComparisons: Array<typeof comparisons.$inferSelect> = [];
  let smartphoneDataUnavailable = false;
  const extendedSlugs:ExtendedCategorySlug[]=["portable-speakers","vr-headsets","wearables","game-consoles"];
  const [headphoneResult, smartphoneResult, ...extendedResults] = await Promise.allSettled([
    Promise.all([
      getDb().select().from(catalogProducts).where(and(eq(catalogProducts.categorySlug, "headphones"), eq(catalogProducts.status, "published"))).orderBy(catalogProducts.canonicalName),
      getDb().select().from(comparisons).where(and(eq(comparisons.categorySlug, "headphones"), eq(comparisons.status, "published"))).orderBy(desc(comparisons.coveragePercent), desc(comparisons.publishedAt)),
    ]),
    getSmartphoneCollection(),
    ...extendedSlugs.map(getExtendedCategoryCollection),
  ]);
  if (headphoneResult.status === "fulfilled") [headphoneProducts, publishedComparisons] = headphoneResult.value;
  else comparisonDataUnavailable = true;
  if (smartphoneResult.status === "fulfilled") { smartphoneProducts = smartphoneResult.value.products; smartphoneComparisons = smartphoneResult.value.comparisons; }
  else smartphoneDataUnavailable = true;
  const extendedData=Object.fromEntries(extendedSlugs.map((slug,index)=>{const result=extendedResults[index];return[slug,result.status==="fulfilled"?{...result.value,dataUnavailable:false}:{products:[],comparisons:[],dataUnavailable:true}];})) as Record<ExtendedCategorySlug,{products:Array<typeof catalogProducts.$inferSelect>;comparisons:Array<typeof comparisons.$inferSelect>;dataUnavailable:boolean}>;
  const productById = new Map(headphoneProducts.map((product) => [product.id, product]));
  const navigableComparisons = sortHeadphoneComparisons(publishedComparisons, productById).flatMap((comparison) => { const left = productById.get(comparison.leftProductId); const right = productById.get(comparison.rightProductId); return left && right && isCurrentPublicComparison(comparison, left, right) ? [{ ...comparison, coveragePercent: getHeadphonePairCoverageForProducts(left, right).coreCoveragePercent }] : []; });
  const featured = navigableComparisons.flatMap((comparison) => { const left = productById.get(comparison.leftProductId); const right = productById.get(comparison.rightProductId); return left && right ? [{ id: comparison.id, slug: comparison.slug, leftName: left.canonicalName, rightName: right.canonicalName, coveragePercent: comparison.coveragePercent }] : []; }).slice(0, 3);
  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader />
      <section className="relative border-b border-white/10">
        <div className="grid-glow" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <div className="eyebrow"><span className="status-dot" />Community-powered comparisons</div>
            <h1 className="mt-5 max-w-xl font-display text-5xl font-black leading-[0.96] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Find what&apos;s <span className="text-gradient">actually better.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Verified specs, clear scoring, real community votes, and no twelve-tab research spiral.
            </p>
          </div>
          <HomeComparisonSwitcher data={{headphones:{products:headphoneProducts,comparisons:navigableComparisons,dataUnavailable:comparisonDataUnavailable},smartphones:{products:smartphoneProducts,comparisons:smartphoneComparisons,dataUnavailable:smartphoneDataUnavailable},"portable-speakers":extendedData["portable-speakers"],"vr-headsets":extendedData["vr-headsets"],wearables:extendedData.wearables,"game-consoles":extendedData["game-consoles"]}} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/[.045] p-6"><div><h2 className="text-2xl font-black">Not sure which products to compare?</h2><p className="mt-2 text-slate-400">Find a shortlist for your budget, priorities, and must-have features across all six categories.</p></div><Link href="/find" className="primary-action">Find my match <ArrowRight className="h-4 w-4"/></Link></div></section>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20"><UseCaseDiscovery featured={featured} /></div>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="section-kicker">Explore categories</p>
            <h2 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">Better picks start here.</h2>
          </div>
          <Link href="/categories" className="text-link">Browse all categories <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => <CategoryCard key={category.slug} category={category} />)}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="section-kicker">Launch category</p>
            <h2 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">Four categories, fully researched.</h2>
          </div>
          <Link href="/categories" className="text-link">See all categories <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {extendedSlugs.map((slug)=><Link key={slug} href={`/category/${slug}`} className="product-card group"><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">{categories.find((c)=>c.slug===slug)?.kicker}</p><h3 className="mt-2 text-xl font-bold text-white group-hover:text-cyan-200">{categories.find((c)=>c.slug===slug)?.name}</h3><p className="mt-4 text-sm text-slate-400">{extendedData[slug].products.length} products · {extendedData[slug].comparisons.length} comparisons</p><ArrowRight className="mt-6 h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300" /></Link>)}
        </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="section-kicker">The Bettr Than method</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <h2 className="max-w-xl font-display text-4xl font-black tracking-tight text-white sm:text-5xl">Facts first. Opinions count. Winners explained.</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Database, title: "Source-backed specs", copy: "Every launch spec points to the manufacturer and carries a checked date." },
                { icon: Scale, title: "Transparent scoring", copy: "Category rules score price, battery, durability, weight, and everyday features." },
                { icon: Users, title: "Community vote", copy: "The crowd gets a separate voice. One vote per browser for each matchup." },
                { icon: CheckCircle2, title: "Useful verdicts", copy: "We show who wins overall—and when the runner-up is the smarter pick for you." },
              ].map(({ icon: Icon, title, copy }) => (
                <article key={title} className="method-card">
                  <Icon className="h-5 w-5 text-cyan-300" />
                  <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© 2026 Bettr Than. Better decisions, minus the noise.</p>
        <p className="max-w-xl sm:text-right">Prices can change. Product photography is credited on category pages. Some purchase links may earn Bettr Than a commission at no extra cost to you. <Link href="/how-we-earn" className="text-cyan-200 underline">How we earn</Link></p>
      </footer>
    </main>
  );
}
