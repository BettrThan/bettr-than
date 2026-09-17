import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoryCard } from "@/components/category-card";
import { SiteHeader } from "@/components/site-header";
import { categories } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Product Categories",
  description: "Explore product categories and find the comparisons that matter to you.",
  alternates: { canonical: "/categories" },
  openGraph: { type: "website", url: "/categories", title: "Product Categories", description: "Explore product categories and find the comparisons that matter to you." },
  twitter: { card: "summary", title: "Product Categories", description: "Explore product categories and find the comparisons that matter to you." },
};

export default function CategoriesPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <Link href="/" className="text-link"><ArrowLeft className="h-4 w-4" /> Home</Link>
        <header className="mt-10 max-w-3xl">
          <p className="section-kicker">Explore Bettr Than</p>
          <h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl">Pick a category. Find the winner.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-400">Start with portable speakers and headphones today, or preview the next four comparison collections joining the site.</p>
        </header>
        <section className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Product categories">
          {categories.map((category) => <CategoryCard key={category.slug} category={category} />)}
        </section>
      </div>
    </main>
  );
}
