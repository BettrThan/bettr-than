import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, ShoppingBag } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductMark } from "@/components/product-mark";
import { SiteHeader } from "@/components/site-header";
import { comparisonSlug, getProduct, products } from "@/lib/products";

type PageProps = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  const canonical = `/product/${product.slug}`;
  return { title: product.name, description: product.description, alternates: { canonical }, openGraph: { type: "website", url: canonical, title: product.name, description: product.description, images: [{ url: "/products/portable-speakers.jpg", alt: product.name }] }, twitter: { card: "summary_large_image", title: product.name, description: product.description, images: ["/products/portable-speakers.jpg"] } };
}

export default async function ProductPage({ params }: PageProps) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const alternatives = products.filter((item) => item.slug !== product.slug);
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/category/portable-speakers" className="text-link"><ArrowLeft className="h-4 w-4" /> Portable speakers</Link>
        <section className="mt-10 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="grid min-h-90 place-items-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-10">
            <ProductMark product={product} />
          </div>
          <div>
            <p className="section-kicker">{product.brand} · {product.eyebrow}</p>
            <h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl">{product.shortName}</h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-cyan-200">
              <CheckCircle2 className="h-4 w-4" /> <strong>Manufacturer source verified</strong>
              <span className="text-slate-500">· checked {product.checkedAt}</span>
            </div>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{product.description}</p>
            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs text-slate-500">Price checked {product.checkedAt}</p><p className="text-3xl font-black text-white">${product.price.toFixed(2)}</p></div>
              <Link href={`/go/${product.slug}`} className="primary-action px-6"><ShoppingBag className="h-5 w-5" /> Check latest price</Link>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.7fr]">
          <div>
            <h2 className="font-display text-2xl font-black text-white">Verified specifications</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              {Object.values(product.specs).map((spec) => (
                <div key={spec.label} className="flex items-center justify-between gap-6 border-b border-white/10 px-5 py-4 last:border-0">
                  <span className="text-slate-400">{spec.label}</span><strong className="text-right text-white">{spec.value}</strong>
                </div>
              ))}
            </div>
            <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="text-link mt-4">View {product.sourceName} source <ExternalLink className="h-4 w-4" /></a>
          </div>
          <div>
            <h2 className="font-display text-2xl font-black text-white">Compare it</h2>
            <div className="mt-5 space-y-3">
              {alternatives.map((alternative) => (
                <Link key={alternative.slug} href={`/compare/${comparisonSlug(product, alternative)}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-cyan-300/40">
                  <ProductMark product={alternative} size="small" />
                  <span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">{alternative.brand}</span><strong className="block truncate text-white">{alternative.shortName}</strong></span>
                  <ArrowRight className="h-4 w-4 text-cyan-300" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
