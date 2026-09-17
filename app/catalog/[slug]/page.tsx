import { catalogProductImage } from "@/lib/product-image";
import { CatalogProductImage } from "@/components/catalog-product-image";
import { SmartphoneSpecifications } from "@/components/smartphone-comparison-experience";
import { ExtendedSpecifications } from "@/components/extended-category-comparison-experience";
import { RelatedComparisons } from "@/components/related-comparisons";
import { getRelatedHeadphoneComparisons } from "@/lib/related-comparisons";
import { getSmartphoneCollection } from "@/lib/smartphone-queries";
import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RetailerOffers } from "@/components/retailer-offers";
import { getDb } from "@/db";
import { catalogProducts } from "@/db/schema";
import type { NormalizedFact } from "@/lib/agents/product-ingestion";
import { headphoneFields, formatHeadphoneSpec, parseHeadphoneSpecs, parseProductSpecProvenance } from "@/lib/headphone-specs";
import { getPublicOffers } from "@/lib/offer-queries";
import type { PublicOffer } from "@/lib/offers";
import { isIndexableCatalogProduct, productJsonLd, safePublicImage, serializeJsonLd } from "@/lib/seo";
import { getExtendedCategoryCollection } from "@/lib/extended-category-queries";
import { isExtendedCategory } from "@/lib/extended-category-specs";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [product] = await getDb().select().from(catalogProducts).where(and(eq(catalogProducts.slug, (await params).slug), eq(catalogProducts.status, "published"))).limit(1);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  const description = product.description ?? `Verified facts for ${product.canonicalName}.`;
  const image = safePublicImage(catalogProductImage(product));
  const canonical = `/catalog/${product.slug}`;
  return { title: product.canonicalName, description, alternates: { canonical }, robots: isIndexableCatalogProduct(product) ? { index: true, follow: true } : { index: false, follow: false }, openGraph: { type: "website", url: canonical, title: product.canonicalName, description, images: image ? [{ url: image, alt: product.canonicalName }] : undefined }, twitter: { card: image ? "summary_large_image" : "summary", title: product.canonicalName, description, images: image ? [image] : undefined } };
}

export default async function CatalogProductPage({ params }: PageProps) {
  const [product] = await getDb().select().from(catalogProducts).where(and(eq(catalogProducts.slug, (await params).slug), eq(catalogProducts.status, "published"))).limit(1); if (!product) notFound();
  let facts: NormalizedFact[] = []; try { facts = JSON.parse(product.factsJson); } catch {}
  const specs = parseHeadphoneSpecs(product.specsJson); const provenance = parseProductSpecProvenance(product.specProvenanceJson); const verifiedSpecs = headphoneFields.filter((field) => specs[field.key]);
  let offers: PublicOffer[] = []; try { offers = (await getPublicOffers([product.id])).get(product.id) ?? []; } catch {}
  const related = product.categorySlug === "headphones" ? await getRelatedHeadphoneComparisons([product.id]).catch(()=>[]) : [];
  const phoneCollection = product.categorySlug === "smartphones" ? await getSmartphoneCollection().catch(()=>null) : null;
  const extendedCollection = isExtendedCategory(product.categorySlug) ? await getExtendedCategoryCollection(product.categorySlug).catch(()=>null) : null;
  return <main className="min-h-screen"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd(product)) }} /><SiteHeader /><div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12"><Link href="/catalog" className="text-link"><ArrowLeft className="h-4 w-4" /> Verified catalog</Link><section className="mt-10 grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center"><div className="grid min-h-80 place-items-center overflow-hidden rounded-3xl border border-white/10 bg-white p-6"><CatalogProductImage product={product} className="max-h-80 w-full object-contain"/></div><div><p className="section-kicker">{product.brand}</p><h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl">{product.canonicalName}</h1><p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Source checked and owner approved</p>{product.description && <p className="mt-6 text-lg leading-8 text-slate-300">{product.description}</p>}</div></section><section className="mt-12"><h2 className="font-display text-2xl font-black text-white">Verified specifications</h2>{product.categorySlug === "smartphones" ? <><SmartphoneSpecifications product={product}/><dl className="mt-5 space-y-3">{facts.map((fact)=><div key={fact.key}><dt className="font-bold">{fact.label}</dt><dd className="mt-1 text-sm leading-6 text-slate-400">{fact.value}</dd></div>)}</dl></> : isExtendedCategory(product.categorySlug) ? <><ExtendedSpecifications category={product.categorySlug} product={product}/><dl className="mt-5 space-y-3">{facts.map((fact)=><div key={fact.key}><dt className="font-bold">{fact.label}</dt><dd className="mt-1 text-sm leading-6 text-slate-400">{fact.value}</dd></div>)}</dl></> : <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">{verifiedSpecs.map((field) => { const source = provenance[field.key]; return <div key={field.key} className="grid gap-2 border-b border-white/10 px-5 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center"><span className="break-words text-slate-400">{field.label}</span><div><strong className="break-words text-white">{formatHeadphoneSpec(field.key, specs[field.key]!)}</strong>{source && <p className="mt-1 text-xs text-slate-500"><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-cyan-300">{source.sourceType} source</a>{source.retrievedAt ? ` · checked ${new Date(source.retrievedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}` : ""}</p>}</div></div>; })}{verifiedSpecs.length === 0 && facts.map((fact) => <div key={fact.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-4 border-b border-white/10 px-5 py-4 last:border-0"><span className="break-words text-slate-400">{fact.label}</span><strong className="break-words text-white">{fact.value}</strong><span className="text-xs text-slate-600">{Math.round(fact.confidence * 100)}%</span></div>)}</div>}<a href={product.sourceUrl} target="_blank" rel="noreferrer" className="text-link mt-5">Primary product source <ExternalLink className="h-4 w-4" /></a></section><section className="mt-12"><RetailerOffers productName={product.canonicalName} offers={offers} /></section><RelatedComparisons comparisons={related}/>{phoneCollection && <section className="mt-10"><h2 className="text-2xl font-black">Compare this phone</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{phoneCollection.comparisons.filter((c)=>c.leftProductId===product.id||c.rightProductId===product.id).map((c)=><Link key={c.id} className="rounded-xl border border-white/10 p-4 text-cyan-200" href={`/compare/smartphones/${c.slug}`}>{phoneCollection.products.find((p)=>p.id===c.leftProductId)?.canonicalName} vs {phoneCollection.products.find((p)=>p.id===c.rightProductId)?.canonicalName}</Link>)}</div></section>}{extendedCollection && <section className="mt-10"><h2 className="text-2xl font-black">Compare this product</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{extendedCollection.comparisons.filter((c)=>c.leftProductId===product.id||c.rightProductId===product.id).map((c)=><Link key={c.id} className="rounded-xl border border-white/10 p-4 text-cyan-200" href={`/compare/${product.categorySlug}/${c.slug}`}>{extendedCollection.products.find((p)=>p.id===c.leftProductId)?.canonicalName} vs {extendedCollection.products.find((p)=>p.id===c.rightProductId)?.canonicalName}</Link>)}</div></section>}</div></main>;
}
