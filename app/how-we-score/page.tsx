import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { headphoneFields, HEADPHONE_SCORING_VERSION } from "@/lib/headphone-specs";
import { smartphoneFields, smartphonePresets, SMARTPHONE_SCORING_VERSION } from "@/lib/smartphone-specs";
import { extendedCategoryModels } from "@/lib/extended-category-specs";

export const metadata: Metadata = {
  title: "How we score products",
  description: "Understand Bettr Than's category scoring weights, missing-data rules, rankings, and commercial independence.",
  alternates: { canonical: "https://bettrthan.com/how-we-score" },
};

const models = [
  { key: "headphones", name: "Headphones", version: HEADPHONE_SCORING_VERSION,
    limitations: "Hardware features do not establish sound quality, noise-cancellation effectiveness, microphone quality, or comfort.",
    factors: headphoneFields.filter(field => field.scorable && field.presetWeights.balanced > 0).map(field => ({ label: field.label, weight: field.presetWeights.balanced })) },
  { key: "smartphones", name: "Smartphones", version: SMARTPHONE_SCORING_VERSION,
    limitations: "This model does not measure camera quality, processing performance, or battery endurance.",
    factors: Object.entries(smartphonePresets.balanced.weights).map(([key, weight]) => ({ label: smartphoneFields.find(field => field.key === key)!.label, weight })) },
  ...Object.entries(extendedCategoryModels).map(([key, model]) => ({ key, name: model.name, version: model.scoringVersion, limitations: model.limitations,
    factors: Object.entries(model.presets.balanced.weights).filter(([, weight]) => weight > 0).map(([key, weight]) => ({ label: model.fields.find(field => field.key === key)!.label, weight })) })),
];

export default function HowWeScorePage() {
  return <main><SiteHeader /><article className="mx-auto max-w-4xl px-5 py-10">
    <p className="section-kicker">Our methodology</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">How we score products</h1>
    <p className="mt-4 text-lg leading-8 text-slate-300">Bettr Than compares verified specifications. Our scores describe measured trade-offs within a category; they are not hands-on reviews or universal product ratings.</p>
    <div className="mt-8 space-y-7 leading-7 text-slate-300">
      <section><h2 className="text-xl font-bold text-white">A score belongs to a matchup</h2><p className="mt-2">Each available factor contributes its assigned weight. Headphones award that weight to the better specification, splitting it for ties or differences below the model’s meaningful threshold. The other categories split numeric-factor weight proportionally between the values, favoring higher or lower values as appropriate. Boolean features split equally when equal and favor the product with the feature otherwise.</p><p className="mt-2">Points are divided by the available scoring weight and scaled to 100. The two scores add to 100, subject to rounding. A score of 60 is a relative share of the matchup, not “60% product quality.” Scores from different categories should not be compared.</p></section>
      <section><h2 className="text-xl font-bold text-white">Missing evidence is not a loss</h2><p className="mt-2">A factor needs verified, applicable values for both products before it contributes. Unknown facts are excluded rather than assumed to be “no” or zero. Publication also requires the category’s evidence-coverage checks and an approved verdict tied to the current model and product data. A comparison can become ineligible when that evidence changes.</p></section>
      <section><h2 className="text-xl font-bold text-white">How rankings are calculated</h2><p className="mt-2">The Rankings page averages each product’s Balanced scores against its eligible published opponents in the same category. With a complete ten-product catalog, that means nine opponents. Results are rounded to one decimal place and sorted highest first. Equal averages are ordered by number of eligible opponents, then product name. Products without an eligible comparison are not ranked.</p><p className="mt-2">Rankings can change when the catalog, evidence, or model changes. Incomplete comparison coverage can give products different sets of opponents. Other priorities are available on comparison pages and in Find my match; the Rankings page always uses Balanced.</p></section>
      <section><h2 className="text-xl font-bold text-white">Votes and money stay separate</h2><p className="mt-2">Community votes express preferences and do not rewrite specifications or the scoring weights. Affiliate commission and sponsorship do not enter the score or ranking.</p><Link href="/how-we-earn" className="text-link mt-3">How retailer relationships work</Link></section>
    </div>
    <h2 className="mt-10 text-2xl font-black">Balanced weights by category</h2><p className="mt-3 text-sm leading-6 text-slate-400">These weights come directly from the active scoring definitions. Percentages show each factor’s share of the full Balanced model; missing evidence changes the available denominator.</p>
    <div className="mt-6 grid gap-5 md:grid-cols-2">{models.map(model => {
      const total = model.factors.reduce((sum, factor) => sum + factor.weight, 0);
      return <section key={model.key} id={model.key} className="rounded-2xl border border-white/10 p-5" data-scoring-category={model.key}>
        <h3 className="text-xl font-bold text-cyan-200">{model.name}</h3><p className="mt-1 break-words text-sm text-slate-400">Model: {model.version}</p>
        <dl className="mt-4 space-y-2">{model.factors.map(factor => <div key={factor.label} className="flex justify-between gap-4 text-sm"><dt>{factor.label}</dt><dd className="shrink-0 font-bold tabular-nums">{Number((factor.weight / total * 100).toFixed(1))}%</dd></div>)}</dl>
        <p className="mt-5 text-sm leading-6 text-slate-400">{model.limitations}</p>
      </section>;
    })}</div>
    <div className="mt-8 flex flex-wrap gap-4"><Link href="/rankings" className="primary-action">See the rankings</Link><Link href="/guides" className="text-link">Read the buying guides</Link></div>
  </article></main>;
}
