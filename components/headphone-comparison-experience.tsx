"use client";
import { ComparisonSpecifications } from "@/components/comparison-specifications";
import { CatalogProductImage } from "@/components/catalog-product-image";
import { WinnerIndicator } from "@/components/winner-indicator";

import { useMemo } from "react";
import { useComparisonPreset } from "@/hooks/use-comparison-preset";
import { Check, ExternalLink, Info, Minus, Trophy } from "lucide-react";
import { CommunityVote } from "@/components/community-vote";
import { RetailerOffers } from "@/components/retailer-offers";
import {
  headphonePresetLabels,
  HEADPHONE_PUBLIC_COVERAGE_THRESHOLD,
  parseProductSpecProvenance,
  scoreHeadphoneComparison,
  type CatalogHeadphone,
  type HeadphonePresetKey,
} from "@/lib/headphone-specs";
import { parseVerdictEvidence } from "@/lib/verdicts";
import type { PublicOffer } from "@/lib/offers";
import { trackDecisionEvent } from "@/lib/analytics-client";

type PublicVerdict = {
  headline: string;
  summary: string;
  buyLeft: string;
  buyRight: string;
  preset: string | null;
  scoringVersion: string | null;
  evidenceJson: string;
};

function scoreLabel(score: number) { return `${score} out of 100`; }

export function HeadphoneComparisonExperience({ comparisonSlug, left, right, verdict, offers }: { comparisonSlug: string; left: CatalogHeadphone; right: CatalogHeadphone; verdict: PublicVerdict | null; offers: { left: PublicOffer[]; right: PublicOffer[] } }) {
  const [preset, setPreset] = useComparisonPreset(Object.keys(headphonePresetLabels) as HeadphonePresetKey[]);
  const result = useMemo(() => scoreHeadphoneComparison(left, right, preset), [left, right, preset]);
  const eligible = result.availableWeight > 0 && result.coreCoveragePercent >= HEADPHONE_PUBLIC_COVERAGE_THRESHOLD;
  const leftProvenance = useMemo(() => parseProductSpecProvenance(left.specProvenanceJson), [left.specProvenanceJson]);
  const rightProvenance = useMemo(() => parseProductSpecProvenance(right.specProvenanceJson), [right.specProvenanceJson]);
  const evidence = useMemo(() => parseVerdictEvidence(verdict?.evidenceJson), [verdict?.evidenceJson]);
  const voteProducts = [{ slug: left.slug, shortName: left.canonicalName }, { slug: right.slug, shortName: right.canonicalName }] as const;
  const voteableAttributes = useMemo(() => result.factors.filter((factor) => factor.weight > 0 && (factor.state === "comparable" || factor.state === "tie")).map((factor) => ({ key: factor.key, label: factor.label })), [result.factors]);

  const choosePreset = (next: HeadphonePresetKey) => {
    if (next !== preset) trackDecisionEvent("preset_changed", { categorySlug: "headphones", comparisonSlug, productIds: [left.id, right.id], presetKey: next });
    setPreset(next);
  };

  return <>
    <section className="mt-10 winner-product-pair" aria-label="Compared products">
      {[left, right].map((product) => { const score = product.id === left.id ? result.scoreLeft : result.scoreRight; const wins = eligible && result.winner?.id === product.id; return <article key={product.id} className={`flex h-full min-w-0 flex-col rounded-3xl border p-6 sm:p-8 ${wins ? "border-cyan-300/50 bg-cyan-300/[0.06]" : "border-white/10 bg-white/[0.035]"}`}><div className="comparison-product-top flex min-h-28 flex-wrap items-start justify-between gap-4"><div className="comparison-product-image grid h-28 w-36 shrink-0 place-items-center rounded-2xl bg-white p-3"><CatalogProductImage product={product} className="max-h-24 max-w-full object-contain" /></div>{wins && <span className="flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#07101f]"><Trophy className="h-3.5 w-3.5" /> Preset leader</span>}</div><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">{product.brand}</p><h2 className="mt-1 text-2xl font-black text-white">{product.canonicalName}</h2><p className="mt-3 min-h-16 text-sm leading-6 text-slate-400">{product.description}</p><div className="mt-auto border-t border-white/10 pt-5 text-center" data-product-score><p className="text-sm font-semibold text-slate-400">Bettr Than Score · {result.presetLabel}</p><p className="font-display text-4xl font-black text-white" aria-label={eligible ? scoreLabel(score) : "Score unavailable"}>{eligible ? score : "—"}<span className="text-base text-slate-600">/100</span></p></div></article>; })}
      <WinnerIndicator leftScore={result.scoreLeft} rightScore={result.scoreRight} eligible={eligible} leftLabel={left.canonicalName} rightLabel={right.canonicalName} scoreLabel={result.presetLabel} />
    </section>

    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7" aria-labelledby="preset-heading">
      <div className="comparison-priorities-heading flex flex-col items-center gap-3"><div><p className="section-kicker">Use-case score</p><h2 id="preset-heading" className="font-display text-2xl font-black text-white">What matters most to you?</h2></div><p className="text-sm text-slate-500">The facts stay fixed; only their published weights change.</p></div>
      <div className="comparison-priorities-options mx-auto mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Scoring preset">{(Object.keys(headphonePresetLabels) as HeadphonePresetKey[]).map((key) => <button key={key} type="button" role="tab" aria-selected={preset === key} onClick={() => choosePreset(key)} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${preset === key ? "border-cyan-300 bg-cyan-300 text-[#07101f]" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40"}`}>{headphonePresetLabels[key]}</button>)}</div>
      <div className="comparison-preset-scores mt-5 grid gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div><p className="text-sm text-slate-400">{left.canonicalName}</p><p className="font-display text-3xl font-black text-white">{result.scoreLeft}<span className="text-sm text-slate-500">/100</span></p></div><p className="text-center text-sm font-black uppercase tracking-wider text-cyan-300">{result.presetLabel}</p><div className="sm:text-right"><p className="text-sm text-slate-400">{right.canonicalName}</p><p className="font-display text-3xl font-black text-white">{result.scoreRight}<span className="text-sm text-slate-500">/100</span></p></div></div>
    </section>

    <section className="mt-6 overflow-hidden rounded-3xl border border-white/10" aria-labelledby="attribute-heading"><div className="bg-white/[0.045] px-4 py-4 sm:px-6"><h2 id="attribute-heading" className="font-display text-xl font-black text-white">Why the {result.presetLabel} score looks this way</h2><p className="mt-1 text-sm text-slate-500">Each row explains whether the fact wins, ties, is missing, or is context only.</p></div><ComparisonSpecifications leftName={left.canonicalName} rightName={right.canonicalName} rows={result.factors.map((factor) => {
      const leftSource = leftProvenance[factor.key]; const rightSource = rightProvenance[factor.key];
      return {
        key: factor.key, label: factor.label, explanation: factor.explanation,
        left: <span className={factor.winner === left.slug ? "font-bold text-cyan-200" : "text-white"}>{factor.left}{factor.winner === left.slug && <Check aria-label="Favorable value" className="ml-1 inline h-4 w-4" />}{factor.state === "tie" && <Minus aria-label="Equal" className="ml-1 inline h-4 w-4 text-slate-500" />}</span>,
        right: <span className={factor.winner === right.slug ? "font-bold text-cyan-200" : "text-white"}>{factor.right}{factor.winner === right.slug && <Check aria-label="Favorable value" className="ml-1 inline h-4 w-4" />}{factor.state === "tie" && <Minus aria-label="Equal" className="ml-1 inline h-4 w-4 text-slate-500" />}</span>,
        leftSource: leftSource && <a href={leftSource.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-300">{left.brand} source{leftSource.retrievedAt ? " · checked " + leftSource.retrievedAt.slice(0, 10) : ""}</a>,
        rightSource: rightSource && <a href={rightSource.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-300">{right.brand} source{rightSource.retrievedAt ? " · checked " + rightSource.retrievedAt.slice(0, 10) : ""}</a>,
      };
    })} /></section>

    <section className="my-6 rounded-3xl border border-amber-300/20 bg-amber-300/[0.055] p-6 sm:p-8" aria-labelledby="editorial-heading"><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Editorial guidance</p>{verdict ? <><h2 id="editorial-heading" className="mt-2 font-display text-2xl font-black text-white">{verdict.headline}</h2><p className="mt-3 max-w-3xl leading-7 text-slate-300">{verdict.summary}</p><div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-[#07101f]/70 p-4"><h3 className="font-bold text-white">Buy {left.canonicalName} if…</h3><p className="mt-2 text-sm leading-6 text-slate-300">{verdict.buyLeft}</p></div><div className="rounded-2xl bg-[#07101f]/70 p-4"><h3 className="font-bold text-white">Buy {right.canonicalName} if…</h3><p className="mt-2 text-sm leading-6 text-slate-300">{verdict.buyRight}</p></div></div>{evidence.length > 0 && <div className="mt-5"><p className="text-sm font-bold text-white">Evidence used</p><div className="mt-2 flex flex-wrap gap-2">{evidence.map((item) => <a key={`${item.productSlug}:${item.key}`} href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-link rounded-xl border border-white/10 px-3 py-2 text-sm">{item.productName}: {item.label} <ExternalLink className="h-3.5 w-3.5" /></a>)}</div></div>}<p className="mt-4 text-xs text-slate-600">Owner-approved guidance · {verdict.preset ? `${headphonePresetLabels[verdict.preset as HeadphonePresetKey] ?? verdict.preset} preset · ` : ""}{verdict.scoringVersion}</p></> : <><h2 id="editorial-heading" className="mt-2 font-display text-2xl font-black text-white">Editorial verdict under review</h2><p className="mt-3 text-slate-400">The objective scores remain available above. A sourced “Buy this if…” recommendation will appear only after owner approval.</p></>}</section>

    <section className="my-6 grid gap-4 lg:grid-cols-2" aria-label="Retailer offers">
      <RetailerOffers productName={left.canonicalName} offers={offers.left} comparisonSlug={comparisonSlug} />
      <RetailerOffers productName={right.canonicalName} offers={offers.right} comparisonSlug={comparisonSlug} />
    </section>

    <section aria-labelledby="people-pick-heading"><div className="sr-only" id="people-pick-heading">People&apos;s Pick</div><CommunityVote comparison={comparisonSlug} products={voteProducts} useCaseKey={preset} attributeOptions={voteableAttributes} /></section>

    <section className="mt-6 rounded-3xl border border-white/10 p-6 sm:p-8"><div className="flex items-center gap-3"><Info className="h-5 w-5 text-cyan-300" /><h2 className="font-display text-xl font-black text-white">Coverage and sources</h2></div><p className="mt-3 text-sm leading-6 text-slate-400">This {result.presetLabel} score uses {result.coveragePercent}% of its configured weight. The products share {result.coreCoveragePercent}% of core Headphones facts. Missing and non-applicable facts never count as losses.</p><div className="mt-5 flex flex-wrap gap-3">{[left, right].map((product) => <a key={product.id} href={product.sourceUrl} target="_blank" rel="noreferrer" className="text-link rounded-xl border border-white/10 px-4 py-3">{product.brand} product source <ExternalLink className="h-4 w-4" /></a>)}</div><p className="mt-4 text-xs text-slate-600">Scoring rules: {result.scoringVersion}</p></section>
  </>;
}
