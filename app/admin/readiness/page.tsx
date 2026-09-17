import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { isAdminUser } from "@/lib/admin-auth";
import { commerceReadiness } from "@/lib/commerce-readiness";
import { getPublicOffers } from "@/lib/offer-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commerce readiness", robots: { index: false, follow: false } };

export default async function ReadinessPage() {
  const user = await requireChatGPTUser("/admin/readiness");
  if (!(await isAdminUser(user))) notFound();
  let report: ReturnType<typeof commerceReadiness> | null = null;
  try {
    const db = getDb();
    const [products, pairs] = await Promise.all([
      db.select().from(catalogProducts).where(eq(catalogProducts.status, "published")),
      db.select().from(comparisons).where(eq(comparisons.status, "published")),
    ]);
    report = commerceReadiness(products, pairs, await getPublicOffers(products.map(product => product.id)));
  } catch (error) { console.error("Commerce readiness unavailable", error); }

  return <main><SiteHeader /><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <nav className="flex flex-wrap gap-4" aria-label="Owner tools"><Link href="/admin/offers" className="text-link">Retailer offers</Link><Link href="/admin/comparisons" className="text-link">Comparison builder</Link><Link href="/admin/analytics" className="text-link">Analytics</Link></nav>
    <p className="section-kicker mt-8">Owner-only workspace</p>
    <h1 className="mt-2 text-3xl font-black">Commerce readiness</h1>
    <p className="mt-3 max-w-3xl text-slate-400">See where shoppers can compare products and find a current buying option. Offer coverage counts only approved, enabled, valid public offers that are in stock and have not expired.</p>
    <p className="mt-3 text-sm text-slate-400">Affiliate labels reflect your offer settings. They do not verify partner enrollment, a sale, or a commission. Confirm your partner approval and authorized links before adding affiliate offers.</p>
    {report === null ? <p role="alert" className="mt-6 rounded-xl border border-amber-300/30 p-5">Could not load readiness. Please reload; no readiness totals are available.</p> : <div className="mt-8 space-y-6">{report.map(group => <section key={group.category} className="rounded-2xl border border-white/10 p-5" data-readiness-category={group.category}>
      <h2 className="text-xl font-bold">{group.name}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[["Published products", group.productCount], ["Current comparisons", `${group.currentComparisons} / ${group.possibleComparisons}`], ["Products with fresh offers", `${group.coveredProducts} / ${group.productCount}`], ["Products with fresh affiliate offers", `${group.affiliateProducts} / ${group.productCount}`]].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-400">{label}</dt><dd className="mt-1 text-2xl font-black text-cyan-200">{value}</dd></div>)}
      </dl>
      {group.productCount < 10 && <p className="mt-4 text-sm text-amber-200">The launch target is ten published products in this category.</p>}
      {group.currentComparisons < group.possibleComparisons && <p className="mt-4 text-sm text-amber-200">{group.possibleComparisons - group.currentComparisons} product pairings need a current, eligible published comparison.</p>}
      {group.gaps.length > 0 ? <ul className="mt-5 divide-y divide-white/10">{group.gaps.map(row => <li key={row.product.id} className="py-3"><Link href={`/catalog/${row.product.slug}`} className="font-semibold text-cyan-200">{row.product.canonicalName}</Link><p className="mt-1 text-sm text-slate-400">{[!row.compared && "Needs a current published comparison", row.freshOffers === 0 && "Needs a fresh in-stock offer", row.staleOffers > 0 && `${row.staleOffers} public offer(s) need a price check`].filter(Boolean).join(" · ")}</p></li>)}</ul> : group.productCount > 0 ? <p className="mt-5 text-sm text-slate-300">Every published product has a current comparison and a fresh in-stock buying option.</p> : <p className="mt-5 text-sm text-slate-400">No published products yet.</p>}
    </section>)}</div>}
    <div className="mt-8 flex flex-wrap gap-4"><Link href="/admin/offers" className="primary-action">Add or update retailer offers</Link><Link href="/admin/research" className="text-link">Review product research</Link></div>
  </div></main>;
}
