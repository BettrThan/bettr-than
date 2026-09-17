import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type RelatedComparison = { id: string; slug: string; leftName: string; rightName: string };

export function RelatedComparisons({ comparisons, title = "Keep comparing" }: { comparisons: RelatedComparison[]; title?: string }) {
  if (comparisons.length === 0) return null;
  return <section className="mt-10" aria-labelledby="related-comparisons"><p className="section-kicker">Related matchups</p><h2 id="related-comparisons" className="mt-1 font-display text-2xl font-black text-white">{title}</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{comparisons.map((comparison) => <Link key={comparison.id} href={`/compare/headphones/${comparison.slug}`} className="group flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:border-cyan-300/40"><span className="font-bold text-white">{comparison.leftName} <span className="text-slate-600">vs</span> {comparison.rightName}</span><ArrowRight className="h-4 w-4 shrink-0 text-cyan-300 transition group-hover:translate-x-1" /></Link>)}</div></section>;
}
