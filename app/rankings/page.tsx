import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { SiteHeader } from "@/components/site-header";
import { CatalogProductImage } from "@/components/catalog-product-image";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { finderCategories, isFinderCategory, rankFinderProducts } from "@/lib/product-finder";

export const dynamic = "force-dynamic";
type Query = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<Query> };

function selectedCategory(query: Query) {
  const value = Array.isArray(query.category) ? query.category[0] : query.category;
  return value && isFinderCategory(value) ? value : "headphones";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const category = selectedCategory(await searchParams);
  return {
    title: `${finderCategories[category]} rankings`,
    description: `See the top-ranked ${finderCategories[category].toLowerCase()} in the Bettr Than catalog using our Balanced comparison scores.`,
    alternates: { canonical: `https://bettrthan.com/rankings?category=${category}` },
  };
}

export default async function RankingsPage({ searchParams }: PageProps) {
  const category = selectedCategory(await searchParams);
  let ranked: ReturnType<typeof rankFinderProducts>["results"] = [];
  let unavailable = false;

  try {
    const db = getDb();
    const [products, pairs] = await Promise.all([
      db.select().from(catalogProducts).where(and(
        eq(catalogProducts.categorySlug, category),
        eq(catalogProducts.status, "published"),
      )),
      db.select().from(comparisons).where(and(
        eq(comparisons.categorySlug, category),
        eq(comparisons.status, "published"),
      )),
    ]);
    ranked = rankFinderProducts(category, products, pairs, {
      preset: "balanced", budget: null, requirements: [],
    }).results.slice(0, 10);
  } catch (error) {
    console.error("Rankings unavailable", error);
    unavailable = true;
  }

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header>
          <p className="section-kicker">Rankings</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{finderCategories[category]}: the top 10</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Ranked by average Balanced comparison score against eligible published opponents in this category. Highest score first.
          </p>
        </header>

        <nav className="my-6 flex flex-wrap gap-2" aria-label="Rankings category">
          {Object.entries(finderCategories).map(([key, label]) => (
            <Link key={key} href={`/rankings?category=${key}`} aria-current={category === key ? "page" : undefined}
              className={`rounded-xl border px-4 py-3 text-sm font-bold ${category === key ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/15 text-slate-300 hover:border-cyan-300/50"}`}>
              {label}
            </Link>
          ))}
        </nav>

        {unavailable ? (
          <p role="alert" className="rounded-2xl border border-amber-300/30 p-5">Rankings are temporarily unavailable. Please reload to try again.</p>
        ) : ranked.length === 0 ? (
          <p className="rounded-2xl border border-white/15 p-6">No products have eligible published comparisons in this category yet.</p>
        ) : (
          <ol aria-label={`${finderCategories[category]} rankings`} className="space-y-3">
            {ranked.map((item, index) => (
              <li key={item.product.id} data-ranking-product={item.product.id}
                className={`grid grid-cols-[2rem_4rem_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-4 sm:grid-cols-[3rem_6rem_minmax(0,1fr)_6rem] sm:gap-5 sm:p-5 ${index === 0 ? "border-cyan-300/40 bg-cyan-300/[.06]" : "border-white/10 bg-white/[.035]"}`}>
                <span aria-label={`Rank ${index + 1}`} className="text-center text-xl font-black tabular-nums text-cyan-200 sm:text-2xl">{index + 1}</span>
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white p-2 sm:h-24 sm:w-24">
                  <CatalogProductImage product={item.product} />
                </div>
                <h2 className="min-w-0 break-words text-base font-bold text-white sm:text-xl">{item.product.canonicalName}</h2>
                <p className="col-start-3 text-left font-black tabular-nums text-cyan-200 sm:col-start-auto sm:text-right">
                  <span className="text-2xl sm:text-3xl">{item.average.toFixed(1)}</span>
                  <span className="ml-1 text-sm font-medium text-slate-400">/100</span>
                </p>
              </li>
            ))}
          </ol>
        )}

        <Link href={`/how-we-score#${category}`} className="text-link mt-6">How these rankings are calculated</Link>
        <p className="mt-6 text-sm leading-6 text-slate-400">
          Scores reflect verified specifications, not community votes or lab ratings. Missing or outdated comparisons are excluded, so coverage can differ between products.
          Equal scores are ordered by comparison coverage, then product name. Up to 10 eligible products are shown.
        </p>
      </div>
    </main>
  );
}
