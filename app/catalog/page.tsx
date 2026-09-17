import { CatalogProductImage } from "@/components/catalog-product-image";
import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, ArrowRight, Database } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { catalogProducts } from "@/db/schema";
import { categories } from "@/lib/categories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verified Product Catalog", description: "Products reviewed and approved through the Bettr Than data-quality pipeline.", alternates: { canonical: "/catalog" }, openGraph: { type: "website", url: "/catalog", title: "Verified Product Catalog", description: "Products reviewed and approved through the Bettr Than data-quality pipeline." }, twitter: { card: "summary", title: "Verified Product Catalog", description: "Products reviewed and approved through the Bettr Than data-quality pipeline." } };

export default async function CatalogPage() {
  let products: typeof catalogProducts.$inferSelect[] = [];
  try { products = await getDb().select().from(catalogProducts).where(eq(catalogProducts.status, "published")).orderBy(desc(catalogProducts.publishedAt)).limit(100); } catch {}
  return <main className="min-h-screen"><SiteHeader /><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16"><Link href="/categories" className="text-link"><ArrowLeft className="h-4 w-4" /> Categories</Link><header className="mt-10 max-w-3xl"><p className="section-kicker">Source-backed database</p><h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl">Verified product catalog</h1><p className="mt-5 text-lg leading-8 text-slate-400">Every product here passed source validation, normalization, data-quality checks, and owner review.</p></header>
    {products.length === 0 ? <div className="mt-12 rounded-3xl border border-dashed border-white/15 p-12 text-center"><Database className="mx-auto h-8 w-8 text-slate-600" /><h2 className="mt-5 text-xl font-black text-white">The review queue is ready</h2><p className="mx-auto mt-2 max-w-lg text-slate-500">Approved agent results will appear here. The existing portable-speaker comparisons remain available now.</p></div> : <section className="mt-12 grid gap-5 md:grid-cols-2">{products.map((product) => <Link key={product.id} href={`/catalog/${product.slug}`} className="product-card group flex min-h-52 gap-5"><div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-white p-2"><CatalogProductImage product={product}/></div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">{categories.find((category) => category.slug === product.categorySlug)?.name}</p><h2 className="mt-2 text-xl font-black text-white group-hover:text-cyan-200">{product.canonicalName}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{product.description}</p><span className="text-link mt-4">View verified facts <ArrowRight className="h-4 w-4" /></span></div></Link>)}</section>}
  </div></main>;
}
