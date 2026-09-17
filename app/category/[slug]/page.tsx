import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { categories, getCategory } from "@/lib/categories";
import { ExtendedCategoryPage } from "@/components/extended-category-page";
import { isExtendedCategory } from "@/lib/extended-category-specs";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = getCategory((await params).slug);
  return category
    ? { title: category.name, description: category.description, alternates:category.live?{canonical:`/category/${category.slug}`}:undefined, robots: { index: category.live, follow: true } }
    : { title: "Category not found", robots: { index: false, follow: false } };
}

export default async function UpcomingCategoryPage({ params }: PageProps) {
  const category = getCategory((await params).slug);
  if(category && isExtendedCategory(category.slug)) return <ExtendedCategoryPage category={category.slug}/>;
  if (!category || category.live) notFound();

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/categories" className="text-link"><ArrowLeft className="h-4 w-4" /> All categories</Link>
        <section className="mt-10 grid overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-80 lg:min-h-125">
            <Image src={category.image} alt={category.imageAlt} fill priority className="object-cover" sizes="(min-width: 1024px) 55vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07101f]/80 via-transparent to-transparent lg:bg-gradient-to-r" />
          </div>
          <div className="flex flex-col justify-center p-7 sm:p-10">
            <p className="section-kicker">{category.kicker}</p>
            <h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl">{category.name}</h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">{category.description}</p>
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <div><strong className="text-white">Comparison data is being verified.</strong><p className="mt-1 text-sm leading-6 text-slate-400">We&apos;re standardizing the specs before scoring these matchups.</p></div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <p className="section-kicker">First matchups in the queue</p>
          <h2 className="font-display text-3xl font-black text-white">Products we&apos;re adding next</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {category.lineup.map((product, index) => (
              <article key={product} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-300/10 font-black text-cyan-200">0{index + 1}</span>
                <div><h3 className="font-bold text-white">{product}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><CheckCircle2 className="h-4 w-4" /> Verification queue</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 flex flex-col items-start justify-between gap-5 rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:flex-row sm:items-center sm:p-8">
          <div><h2 className="font-display text-2xl font-black text-white">Want to compare something now?</h2><p className="mt-2 text-slate-400">The portable-speaker comparison lab is already live.</p></div>
          <Link href="/category/portable-speakers" className="primary-action shrink-0 px-6">Compare speakers <ArrowRight className="h-5 w-5" /></Link>
        </section>

        <p className="mt-8 text-xs text-slate-600">Photo: <a href={category.photoSource} target="_blank" rel="noreferrer" className="underline hover:text-cyan-300">{category.photoCredit}</a></p>
      </div>
    </main>
  );
}
