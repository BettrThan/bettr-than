import { ComparisonSpecifications } from "@/components/comparison-specifications";
import { WinnerIndicator } from "@/components/winner-indicator";
import { ComparisonPageSelector } from "@/components/comparison-page-selector";
import { getExtendedCategoryCollection } from "@/lib/extended-category-queries";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, Info, ShoppingBag, Trophy } from "lucide-react";
import { notFound } from "next/navigation";
import { CommunityVote } from "@/components/community-vote";
import { ProductMark } from "@/components/product-mark";
import { SiteHeader } from "@/components/site-header";
import { comparisonSlug, getComparisonProducts, products, scoreComparison } from "@/lib/products";

type PageProps = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  const params = [];
  for (let i = 0; i < products.length; i += 1) {
    for (let j = i + 1; j < products.length; j += 1) {
      params.push({ category: comparisonSlug(products[i], products[j]) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: comparison } = await params;
  const pair = getComparisonProducts(comparison);
  if (!pair) return { title: "Comparison not found", robots: { index: false, follow: false } };
  const canonical = `/compare/${comparison}`;
  const title = `${pair[0].shortName} vs ${pair[1].shortName}`;
  const description = `Compare ${pair[0].name} and ${pair[1].name}: price, battery, durability, weight, features, and community vote.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, title, description, images: [{ url: "/compare-speakers.png", alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: ["/compare-speakers.png"] },
  };
}

export default async function ComparisonPage({ params }: PageProps) {
  const { category: comparison } = await params;
  const pair = getComparisonProducts(comparison);
  if (!pair) notFound();
  const [left, right] = pair;
  const result = scoreComparison(left, right);
  const runnerUp = result.winner?.slug === left.slug ? right : left;
  const liveCollection = await getExtendedCategoryCollection("portable-speakers").catch(() => null);
  const liveLeft = liveCollection?.products.find(product => product.slug === left.slug);
  const liveRight = liveCollection?.products.find(product => product.slug === right.slug);
  const legacyCollection = {
    products: products.map(product => ({ id: product.slug, slug: product.slug, canonicalName: product.name, brand: product.brand })),
    comparisons: products.flatMap((first, index) => products.slice(index + 1).map(second => ({ id: comparisonSlug(first, second), slug: comparisonSlug(first, second), leftProductId: first.slug, rightProductId: second.slug, coveragePercent: 100, verdictStatus: "approved", href: `/compare/${comparisonSlug(first, second)}` }))),
  };

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="text-link mb-8"><ArrowLeft className="h-4 w-4" /> Back to comparison lab</Link>
        <ComparisonPageSelector category="portable-speakers" leftId={liveLeft && liveRight ? liveLeft.id : left.slug} rightId={liveLeft && liveRight ? liveRight.id : right.slug} collection={liveLeft && liveRight ? liveCollection! : legacyCollection} />

        <section className="mt-10 winner-product-pair">
          {[left, right].map((product) => {
            const score = product.slug === left.slug ? result.scoreA : result.scoreB;
            const wins = result.winner?.slug === product.slug;
            return (
              <article key={product.slug} className={`min-w-0 rounded-3xl border p-6 sm:p-8 ${wins ? "border-cyan-300/50 bg-cyan-300/[0.06]" : "border-white/10 bg-white/[0.035]"}`}>
                <div className="comparison-product-top flex items-start justify-between gap-4">
                  <div className="comparison-product-image flex items-center justify-center"><ProductMark product={product} /></div>
                  {wins && <span className="flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#07101f]"><Trophy className="h-3.5 w-3.5" /> Winner</span>}
                </div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{product.brand}</p>
                <h2 className="mt-1 text-2xl font-black text-white">{product.shortName}</h2>
                <p className="mt-3 min-h-18 text-sm leading-6 text-slate-400">{product.description}</p>
                <div className="mt-6 space-y-4 border-t border-white/10 pt-5 text-center" data-product-score>
                  <div><p className="text-xs text-slate-500">Bettr Than score</p><p className="font-display text-4xl font-black text-white">{score}<span className="text-base text-slate-600">/100</span></p></div>
                  <div><p className="text-xs text-slate-500">Last checked</p><p className="text-2xl font-black text-white">${product.price.toFixed(2)}</p></div>
                </div>
                <Link href={`/go/${product.slug}`} className="primary-action mt-6">
                  <ShoppingBag className="h-5 w-5" /> Check price
                </Link>
              </article>
            );
          })}
          <WinnerIndicator leftScore={result.scoreA} rightScore={result.scoreB} leftLabel={left.shortName} rightLabel={right.shortName} />
        </section>

        <section className="mt-6">
          <h2 className="text-2xl font-black">Side-by-side specifications</h2>
          <ComparisonSpecifications leftName={left.shortName} rightName={right.shortName} rows={[
            ...result.factors.map((factor) => ({
              key: factor.key, label: factor.label,
              left: <span className={factor.winner === left.slug ? "font-bold text-cyan-200" : "text-white"}>{factor.left}{factor.winner === left.slug && <Check aria-label="Favorable value" className="ml-1 inline h-4 w-4" />}</span>,
              right: <span className={factor.winner === right.slug ? "font-bold text-cyan-200" : "text-white"}>{factor.right}{factor.winner === right.slug && <Check aria-label="Favorable value" className="ml-1 inline h-4 w-4" />}</span>,
            })),
            { key: "checked-price", label: "Checked price", left: "$" + left.price.toFixed(2), right: "$" + right.price.toFixed(2) },
          ]} />
        </section>

        <section className="my-6 grid gap-4 rounded-3xl border border-amber-300/20 bg-amber-300/[0.055] p-6 sm:p-8 lg:grid-cols-[auto_1fr]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300 text-[#07101f]"><Trophy className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">The verdict</p>
            <h2 className="mt-2 font-display text-2xl font-black text-white">{result.winner ? `${result.winner.name} wins this matchup.` : "This matchup is a tie."}</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
              It earns the stronger overall score across price, battery life, water and dust protection, weight, USB-C support, and flotation. Choose {runnerUp.name} instead when its particular strengths fit your priorities better.
            </p>
          </div>
        </section>

        <CommunityVote comparison={comparison} products={pair} />

        <section className="mt-6 rounded-3xl border border-white/10 p-6 sm:p-8">
          <div className="flex items-center gap-3"><Info className="h-5 w-5 text-cyan-300" /><h2 className="font-display text-xl font-black text-white">Sources & price note</h2></div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Specs come from manufacturer product and support pages. Prices are snapshots and can change by color, seller, or promotion.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {pair.map((product) => (
              <a key={product.slug} href={product.sourceUrl} target="_blank" rel="noreferrer" className="text-link rounded-xl border border-white/10 px-4 py-3">
                {product.sourceName} source <ExternalLink className="h-4 w-4" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
