import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, BarChart3, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { OfferImporter } from "@/components/offer-importer";
import { isStaleOffer } from "@/lib/offers";
import { OfferManager } from "@/components/offer-manager";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { catalogProducts, retailerOffers, retailers } from "@/db/schema";
import { isAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Retailer Offers", robots: { index: false, follow: false } };

export default async function OffersAdminPage() {
  const user = await requireChatGPTUser("/admin/offers");
  if (!(await isAdminUser(user))) notFound();
  const [products, retailerRows, offers] = await Promise.all([
    getDb().select({ id: catalogProducts.id, canonicalName: catalogProducts.canonicalName, brand: catalogProducts.brand, slug: catalogProducts.slug, categorySlug: catalogProducts.categorySlug }).from(catalogProducts).where(eq(catalogProducts.status, "published")).orderBy(asc(catalogProducts.canonicalName)),
    getDb().select().from(retailers).orderBy(asc(retailers.name)),
    getDb().select().from(retailerOffers).orderBy(desc(retailerOffers.updatedAt)),
  ]);
  const retailerById = new Map(retailerRows.map((retailer) => [retailer.id, retailer]));
  const offerRows = offers.flatMap((offer) => { const retailer = retailerById.get(offer.retailerId); return retailer ? [{ ...offer, retailerName: retailer.name, retailerUrl: retailer.homepageUrl, affiliateStatus: offer.isSponsored ? "sponsored" : offer.isAffiliate ? "affiliate" : "none" }] : []; });
  const fresh = offers.filter(offer=>offer.status==="approved"&&!isStaleOffer(offer)&&offer.availability==="in_stock"&&retailerById.get(offer.retailerId)?.enabled);
  const covered = new Set(fresh.map(offer=>offer.productId));
  return <main className="min-h-screen"><SiteHeader /><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/comparisons" className="text-link"><ArrowLeft className="h-4 w-4" /> Comparison builder</Link><div className="flex flex-wrap gap-3"><Link href="/admin/readiness" className="text-link">Commerce readiness</Link><Link href="/admin/ingestion" className="text-link">Product Agent Console</Link><Link href="/admin/analytics" className="text-link"><BarChart3 className="h-4 w-4" /> Analytics</Link></div></div><header className="mt-9 mb-10"><p className="section-kicker"><LockKeyhole className="mr-2 inline h-4 w-4" />Owner-only workspace</p><h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl">Retailer offer manager</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">Maintain current retailer prices without mixing commercial relationships into product scores or editorial verdicts.</p></header><section className="mb-8 grid gap-3 sm:grid-cols-3" aria-label="Retailer offer readiness"><article className="rounded-2xl border border-white/10 p-5"><p className="text-sm text-slate-400">Products with fresh in-stock offers</p><p className="mt-2 text-3xl font-black">{products.filter(p=>covered.has(p.id)).length} / {products.length}</p></article><article className="rounded-2xl border border-white/10 p-5"><p className="text-sm text-slate-400">Fresh affiliate offers</p><p className="mt-2 text-3xl font-black">{fresh.filter(offer=>offer.isAffiliate).length}</p></article><article className="rounded-2xl border border-white/10 p-5"><p className="text-sm text-slate-400">Approved offers needing a price check</p><p className="mt-2 text-3xl font-black">{offers.filter(offer=>offer.status==="approved"&&isStaleOffer(offer)).length}</p></article></section><div className="mb-8"><OfferImporter products={products}/></div><OfferManager products={products} retailers={retailerRows} offers={offerRows} /></div></main>;
}
