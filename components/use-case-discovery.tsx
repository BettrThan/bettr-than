"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Check, CircleDollarSign, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HeadphonePresetKey } from "@/lib/headphone-specs";

type FeaturedComparison = { id: string; slug: string; leftName: string; rightName: string; coveragePercent: number };

const paths: Array<{ key: Exclude<HeadphonePresetKey, "balanced">; title: string; copy: string; icon: typeof Plane }> = [
  { key: "travel", title: "Travel", copy: "Prioritize ANC, battery life, low weight, and packability.", icon: Plane },
  { key: "office", title: "Office", copy: "Prioritize multipoint, ANC, connectivity, and all-day utility.", icon: BriefcaseBusiness },
  { key: "value", title: "Value", copy: "Prioritize price while keeping the everyday essentials in view.", icon: CircleDollarSign },
];

export function UseCaseDiscovery({ featured }: { featured: FeaturedComparison[] }) {
  const [requested, setRequested] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const requestMore = async (useCase: string) => {
    setError(null);
    try {
      const storageKey = `bettr-discovery-request:${useCase}`;
      if (localStorage.getItem(storageKey)) { setRequested((current) => [...new Set([...current, useCase])]); return; }
      const response = await fetch("/api/discovery-interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ useCase }) });
      if (!response.ok) throw new Error();
      localStorage.setItem(storageKey, "saved");
      setRequested((current) => [...new Set([...current, useCase])]);
    } catch { setError("We could not save that request. Please try again."); }
  };

  return <section aria-labelledby="use-case-heading">
    <div><p className="section-kicker">Shop by need</p><h2 id="use-case-heading" className="mt-1 font-display text-3xl font-black text-white sm:text-4xl">Better for your day.</h2><p className="mt-3 max-w-2xl text-slate-400">The same verified facts, weighted for how you plan to use your headphones.</p></div>
    <div className="mt-6 grid gap-4 md:grid-cols-3">{paths.map(({ key, title, copy, icon: Icon }, index) => { const comparison = featured.length ? featured[index % featured.length] : undefined; const saved = requested.includes(key); return <article key={key} className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-5"><Icon className="h-6 w-6 text-cyan-300" /><h3 className="mt-4 text-xl font-black text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>{comparison ? <><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Featured · {comparison.coveragePercent}% coverage</p><p className="mt-1 font-bold text-white">{comparison.leftName} vs {comparison.rightName}</p><Link href={`/compare/headphones/${comparison.slug}?preset=${key}`} className="text-link mt-auto pt-5">View {title} result <ArrowRight className="h-4 w-4" /></Link></> : <div className="mt-auto pt-5"><p className="text-sm text-slate-500">No complete {title.toLowerCase()} matchup is published yet.</p><Button type="button" variant="outline" size="sm" className="mt-3 border-white/10 bg-white/5" disabled={saved} onClick={() => requestMore(key)}>{saved ? <><Check />Request saved</> : `Request ${title} comparisons`}</Button></div>}</article>; })}</div>
    {featured.length > 0 && <p className="mt-3 text-xs text-slate-600">Featured automatically from published comparisons with an owner-approved verdict and at least 70% shared core coverage.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
  </section>;
}
