import { sortHeadphoneComparisons } from "@/lib/launch-plan";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, ArrowRight, CheckCircle2, Headphones, Scale } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { UseCaseDiscovery } from "@/components/use-case-discovery";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";
import { formatHeadphoneSpec, getHeadphonePairCoverageForProducts, headphoneFields, parseHeadphoneSpecs } from "@/lib/headphone-specs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Headphones",
  description: "Compare verified headphones by battery life, noise cancellation, weight, connectivity, and value.",
  alternates: { canonical: "/category/headphones" },
  openGraph: { type: "website", url: "/category/headphones", title: "Headphones", description: "Compare verified headphones by battery life, noise cancellation, weight, connectivity, and value.", images: [{ url: "/products/headphones.jpg", alt: "Wireless over-ear headphones" }] },
  twitter: { card: "summary_large_image", title: "Headphones", description: "Compare verified headphones by battery life, noise cancellation, weight, connectivity, and value.", images: ["/products/headphones.jpg"] },
};

type CatalogProduct = typeof catalogProducts.$inferSelect;
type Comparison = typeof comparisons.$inferSelect;

async function getHeadphoneCollection() {
  const db = getDb();
  const [products, publishedComparisons] = await Promise.all([
    db
      .select()
      .from(catalogProducts)
      .where(and(eq(catalogProducts.categorySlug, "headphones"), eq(catalogProducts.status, "published")))
      .orderBy(desc(catalogProducts.publishedAt)),
    db
      .select()
      .from(comparisons)
      .where(and(eq(comparisons.categorySlug, "headphones"), eq(comparisons.status, "published")))
      .orderBy(desc(comparisons.publishedAt)),
  ]);

  return { products, publishedComparisons };
}

function ProductImage({ product }: { product: CatalogProduct }) {
  return (
    <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-white p-5">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.canonicalName}
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="font-display text-5xl font-black text-slate-300">
          {product.brand.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: CatalogProduct }) {
  const specs = parseHeadphoneSpecs(product.specsJson);
  const verifiedFields = headphoneFields.filter((field) => specs[field.key]);
  const featuredFields = verifiedFields.filter((field) =>
    ["price_usd", "battery_life_hours", "active_noise_cancellation", "weight_grams"].includes(field.key),
  ).slice(0, 3);

  return (
    <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <ProductImage product={product} />
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">{product.brand}</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" /> Approved
        </span>
      </div>
      <h3 className="mt-2 text-2xl font-black text-white">{product.canonicalName}</h3>
      {product.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{product.description}</p>}

      {featuredFields.length > 0 ? (
        <dl className="mt-5 grid gap-2">
          {featuredFields.map((field) => (
            <div key={field.key} className="flex items-center justify-between gap-4 rounded-xl bg-[#07101f] px-4 py-3 text-sm">
              <dt className="text-slate-400">{field.label}</dt>
              <dd className="text-right font-bold text-white">{formatHeadphoneSpec(field.key, specs[field.key]!)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-500">
          Detailed specifications are being verified.
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-5">
        <span className="text-xs text-slate-500">{verifiedFields.length} normalized specs</span>
        <Link href={`/catalog/${product.slug}`} className="text-link">
          View product <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function ComparisonCard({ comparison, productsById }: { comparison: Comparison; productsById: Map<string, CatalogProduct> }) {
  const left = productsById.get(comparison.leftProductId);
  const right = productsById.get(comparison.rightProductId);
  if (!left || !right) return null;

  return (
    <Link
      href={`/compare/headphones/${comparison.slug}`}
      className="group block rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.055]"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="min-w-0 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{left.brand}</p>
          <p className="mt-1 font-black text-white">{left.canonicalName}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-cyan-300 font-display text-sm font-black text-[#07101f]">VS</span>
        <div className="min-w-0 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{right.brand}</p>
          <p className="mt-1 font-black text-white">{right.canonicalName}</p>
        </div>
      </div>
      <p className="mt-5 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-sm font-bold text-cyan-300">
        See the winner <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </p>
    </Link>
  );
}

export default async function HeadphonesCategoryPage() {
  let products: CatalogProduct[] = [];
  let publishedComparisons: Comparison[] = [];
  let dataUnavailable = false;

  try {
    ({ products, publishedComparisons } = await getHeadphoneCollection());
  } catch {
    dataUnavailable = true;
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  publishedComparisons = publishedComparisons.flatMap((comparison) => { const left = productsById.get(comparison.leftProductId); const right = productsById.get(comparison.rightProductId); return left && right && isCurrentPublicComparison(comparison, left, right) ? [{ ...comparison, coveragePercent: getHeadphonePairCoverageForProducts(left, right).coreCoveragePercent }] : []; });
  publishedComparisons = sortHeadphoneComparisons(publishedComparisons, productsById);
  const featured = publishedComparisons.flatMap((comparison) => { const left = productsById.get(comparison.leftProductId); const right = productsById.get(comparison.rightProductId); return left && right ? [{ id: comparison.id, slug: comparison.slug, leftName: left.canonicalName, rightName: right.canonicalName, coveragePercent: comparison.coveragePercent }] : []; }).slice(0, 3);

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <Link href="/categories" className="text-link"><ArrowLeft className="h-4 w-4" /> All categories</Link>

        <header className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="p-7 sm:p-10 lg:p-12">
              <p className="section-kicker">Audio · Live collection</p>
              <h1 className="mt-2 font-display text-5xl font-black tracking-tight text-white sm:text-6xl">Headphones</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Compare approved headphones using consistent facts for noise cancellation, battery life, comfort, connectivity, and value.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-200">
                  <Headphones className="h-4 w-4" /> {products.length} approved products
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-slate-300">
                  <Scale className="h-4 w-4" /> {publishedComparisons.length} live comparisons
                </span>
              </div>
            </div>
            <div className="relative min-h-64 self-stretch lg:min-h-full">
              <Image src="/products/headphones.jpg" alt="Blue Sony wireless over-ear headphones" fill priority className="object-cover" sizes="(min-width: 1024px) 40vw, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07101f]/60 to-transparent lg:bg-gradient-to-r" />
            </div>
          </div>
        </header>

        {dataUnavailable ? (
          <section className="mt-12 rounded-3xl border border-amber-300/20 bg-amber-300/5 p-8">
            <h2 className="text-xl font-black text-white">The catalog is temporarily unavailable</h2>
            <p className="mt-2 text-slate-400">Please check back shortly while the product data reconnects.</p>
          </section>
        ) : (
          <>
            <div className="mt-14"><UseCaseDiscovery featured={featured} /></div>
            <section className="mt-14" aria-labelledby="headphone-comparisons">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="section-kicker">Head-to-head</p>
                  <h2 id="headphone-comparisons" className="mt-1 font-display text-3xl font-black text-white sm:text-4xl">Latest comparisons</h2>
                </div>
              </div>
              {publishedComparisons.length > 0 ? (
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  {publishedComparisons.map((comparison) => (
                    <ComparisonCard key={comparison.id} comparison={comparison} productsById={productsById} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-7 sm:p-8">
                  <p className="text-lg font-bold text-white">The first Headphones matchups are being prepared.</p>
                  <p className="mt-2 text-slate-400">Approved products are already available below, with detailed comparisons coming next.</p>
                </div>
              )}
            </section>

            <section className="mt-14" aria-labelledby="approved-headphones">
              <p className="section-kicker">Verified catalog</p>
              <h2 id="approved-headphones" className="mt-1 font-display text-3xl font-black text-white sm:text-4xl">Approved headphones</h2>
              {products.length > 0 ? (
                <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <p className="mt-6 rounded-3xl border border-dashed border-white/15 p-8 text-slate-400">The first approved products will appear here.</p>
              )}
            </section>
          </>
        )}

        <p className="mt-10 text-xs text-slate-600">
          Category photo: <a href="https://commons.wikimedia.org/wiki/File:Sony_WH-CH510_Bluetooth_Over-Ear_Headphone.jpg" target="_blank" rel="noreferrer" className="underline hover:text-cyan-300">RPSkokie / Wikimedia Commons</a>
        </p>
      </div>
    </main>
  );
}
