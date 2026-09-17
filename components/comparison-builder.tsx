"use client";

import { useMemo, useState } from "react";
import { comparisonPairKey as pairKey } from "@/lib/comparison-pair";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleAlert, Layers3, Loader2, Rocket, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VerdictEditor } from "@/components/verdict-editor";
import { getHeadphonePairCoverageForProducts, headphoneFields, type CatalogHeadphone } from "@/lib/headphone-specs";

type ProductOption = {
  id: string;
  canonicalName: string;
  brand: string;
  slug: string;
  sourceUrl: string;
  imageUrl: string | null;
  description: string | null;
  status: string;
  specsJson: string;
  specProvenanceJson: string;
  verifiedFieldCount: number;
  scoreCoverage: number;
  coreCoveragePercent: number;
};

type ExistingComparison = {
  id: string;
  slug: string;
  leftProductId: string;
  rightProductId: string;
  status: string;
  coveragePercent: number;
  scoringVersion: string;
  verdictStatus: string;
  verdictHeadline: string | null;
  verdict: string | null;
  verdictBuyLeft: string | null;
  verdictBuyRight: string | null;
  verdictEvidenceJson: string;
  verdictPreset: string | null;
  verdictScoringVersion: string | null;
};

type SuggestedMatchup = {
  left: ProductOption;
  right: ProductOption;
  sharedFieldCount: number;
  scoreCoverage: number;
  coreCoveragePercent: number;
};


export function ComparisonBuilder({ products, existingComparisons }: { products: ProductOption[]; existingComparisons: ExistingComparison[] }) {
  const router = useRouter();
  const [leftProductId, setLeftProductId] = useState(products[0]?.id ?? "");
  const [rightProductId, setRightProductId] = useState(products[1]?.id ?? "");
  const [busy, setBusy] = useState<boolean | string>(false);
  const [result, setResult] = useState<{ slug: string; status: string; duplicate?: boolean } | null>(null);
  const [batchResult, setBatchResult] = useState<{ created: number; pairs: Array<{ slug: string; leftName: string; rightName: string; coveragePercent: number }> } | null>(null);
  const [publishResult, setPublishResult] = useState<{ products: number; published: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputClass = "min-h-12 w-full rounded-xl border border-white/10 bg-[#07101f] px-3 text-base text-white outline-none focus:border-cyan-300/50";

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const existingPairs = useMemo(() => new Set(existingComparisons.map((comparison) => pairKey(comparison.leftProductId, comparison.rightProductId))), [existingComparisons]);

  const suggestions = useMemo(() => {
    const matches: SuggestedMatchup[] = [];
    for (let leftIndex = 0; leftIndex < products.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < products.length; rightIndex += 1) {
        const left = products[leftIndex];
        const right = products[rightIndex];
        if (existingPairs.has(pairKey(left.id, right.id))) continue;
        const coverage = getHeadphonePairCoverageForProducts(left as CatalogHeadphone, right as CatalogHeadphone);
        if (coverage.sharedFieldCount === 0) continue;
        matches.push({ left, right, ...coverage });
      }
    }
    return matches.sort((a, b) => {
      const aBrandBonus = a.left.brand !== a.right.brand ? 10 : 0;
      const bBrandBonus = b.left.brand !== b.right.brand ? 10 : 0;
      return (b.coreCoveragePercent + bBrandBonus) - (a.coreCoveragePercent + aBrandBonus);
    }).slice(0, 3);
  }, [existingPairs, products]);

  const leftProduct = productById.get(leftProductId);
  const rightProduct = productById.get(rightProductId);
  const selectedCoverage = leftProduct && rightProduct
    ? getHeadphonePairCoverageForProducts(leftProduct as CatalogHeadphone, rightProduct as CatalogHeadphone)
    : { sharedFieldCount: 0, sharedCoreFieldCount: 0, coreFieldCount: 0, scoreCoverage: 0, coreCoveragePercent: 0, eligible: false };
  const selectedExists = Boolean(leftProduct && rightProduct && existingPairs.has(pairKey(leftProduct.id, rightProduct.id)));
  const ready = selectedCoverage.eligible;

  const selectMatchup = (matchup: SuggestedMatchup) => {
    setLeftProductId(matchup.left.id);
    setRightProductId(matchup.right.id);
    setError(null);
    setResult(null);
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/admin/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leftProductId, rightProductId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to create comparison.");
      setResult({ slug: body.slug, status: body.status, duplicate: body.duplicate });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create comparison.");
    } finally {
      setBusy(false);
    }
  };

  const createBatch = async () => {
    setBusy("batch");
    setError(null);
    setBatchResult(null);
    try {
      const response = await fetch("/api/admin/comparisons/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 20 }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to prepare comparison drafts.");
      setBatchResult({ created: body.created, pairs: body.pairs ?? [] });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to prepare comparison drafts.");
    } finally {
      setBusy(false);
    }
  };

  const publishAll = async () => {
    setBusy("publish-all");
    setError(null);
    setPublishResult(null);
    try {
      const response = await fetch("/api/admin/comparisons/publish-all", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to publish eligible comparisons.");
      setPublishResult({ products: body.products, published: body.published });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to publish eligible comparisons.");
    } finally {
      setBusy(false);
    }
  };

  const transition = async (comparison: ExistingComparison, nextStatus: "needs_review" | "approved" | "published") => {
    setBusy(`${comparison.id}:${nextStatus}`);
    setError(null);
    try {
      const response = await fetch("/api/admin/comparisons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comparisonId: comparison.id, nextStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to update comparison.");
      setResult({ slug: body.slug, status: body.status });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update comparison.");
    } finally {
      setBusy(false);
    }
  };

  if (products.length < 2) return <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center"><Scale className="mx-auto h-8 w-8 text-slate-600" /><h2 className="mt-4 text-xl font-black text-white">Publish two headphones first</h2><p className="mx-auto mt-2 max-w-lg text-slate-500">The builder uses owner-approved catalog products with normalized Headphones specifications.</p><Link href="/admin/ingestion" className="text-link mt-5">Open Product Agent Console <ArrowRight className="h-4 w-4" /></Link></div>;

  return <div className="space-y-8">
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Comparison readiness summary">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-sm text-slate-400">Approved products</p><p className="mt-1 font-display text-3xl font-black text-white">{products.length}</p></div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-sm text-slate-400">Live comparisons</p><p className="mt-1 font-display text-3xl font-black text-white">{existingComparisons.filter((comparison) => comparison.status === "published").length}</p></div>
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-5"><p className="text-sm text-cyan-100">Ready matchups</p><p className="mt-1 font-display text-3xl font-black text-white">{suggestions.length}</p></div>
    </section>

    <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.04] p-5 sm:p-7" aria-labelledby="batch-comparisons">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="section-kicker"><Layers3 className="mr-2 inline h-4 w-4" />Batch workflow</p><h2 id="batch-comparisons" className="mt-1 font-display text-2xl font-black text-white">Build the comparison library</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Prepare 20 drafts for manual review, or publish every eligible matchup with a verified, evidence-backed verdict.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="lg" onClick={createBatch} disabled={Boolean(busy)} className="rounded-xl font-black">{busy === "batch" ? <Loader2 className="animate-spin" /> : <Layers3 />} Prepare 20 drafts</Button>
          <Button type="button" size="lg" onClick={publishAll} disabled={Boolean(busy)} className="rounded-xl font-black">{busy === "publish-all" ? <Loader2 className="animate-spin" /> : <Rocket />} Publish all eligible</Button>
        </div>
      </div>
      {batchResult && <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4"><p className="font-bold text-emerald-100">Prepared {batchResult.created} comparison draft{batchResult.created === 1 ? "" : "s"} for review.</p>{batchResult.pairs.length > 0 && <ul className="mt-3 grid gap-1 text-sm text-slate-300 sm:grid-cols-2">{batchResult.pairs.map((pair) => <li key={pair.slug}>{pair.leftName} vs {pair.rightName} · {pair.coveragePercent}% core coverage</li>)}</ul>}</div>}
      {publishResult && <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4"><p className="font-bold text-emerald-100">Published all {publishResult.published} eligible comparisons across {publishResult.products} approved products.</p></div>}
    </section>

    <section aria-labelledby="product-readiness">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="section-kicker">Data check</p><h2 id="product-readiness" className="mt-1 font-display text-2xl font-black text-white">Product readiness</h2></div>
        <Link href="/admin/ingestion" className="text-link">Edit product specs <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {products.map((product) => <article key={product.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">{product.brand}</p><h3 className="mt-1 font-bold text-white">{product.canonicalName}</h3></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${product.coreCoveragePercent >= 70 ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-200"}`}>{product.coreCoveragePercent >= 70 ? "Ready" : "Needs data"}</span></div>
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-400">Core-field coverage</span><strong className="text-white">{product.coreCoveragePercent}%</strong></div>
          <Progress value={product.coreCoveragePercent} className="mt-2 bg-white/10" aria-label={`${product.canonicalName} core-field coverage`} />
          <p className="mt-3 text-xs text-slate-500">{product.verifiedFieldCount} of {headphoneFields.length} fields verified · {product.scoreCoverage}% balanced-score coverage</p>
        </article>)}
      </div>
    </section>

    <section aria-labelledby="suggested-matchups">
      <div><p className="section-kicker"><Sparkles className="mr-2 inline h-4 w-4" />Best next step</p><h2 id="suggested-matchups" className="mt-1 font-display text-2xl font-black text-white">Recommended matchups</h2></div>
        {suggestions.length > 0 ? <div className="mt-5 grid gap-3 lg:grid-cols-3">{suggestions.map((matchup) => <article key={pairKey(matchup.left.id, matchup.right.id)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="font-black text-white">{matchup.left.canonicalName}</p><p className="my-1 text-xs font-black text-cyan-300">VS</p><p className="font-black text-white">{matchup.right.canonicalName}</p><p className="mt-4 text-sm text-slate-400">{matchup.sharedFieldCount} shared fields · {matchup.coreCoveragePercent}% core coverage</p><Button type="button" variant="outline" onClick={() => selectMatchup(matchup)} className="mt-4 w-full border-white/10 bg-white/5 text-white hover:bg-white/10">Use matchup</Button></article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-6"><p className="font-bold text-white">No new matchups are ready yet.</p><p className="mt-2 text-sm text-slate-400">Add the same core specifications—such as price, battery life, ANC, and weight—to at least two products.</p></div>}
    </section>

    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7" aria-labelledby="build-comparison">
      <h2 id="build-comparison" className="font-display text-2xl font-black text-white">Build a comparison</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <label className="text-sm font-bold text-slate-300">First product<select value={leftProductId} onChange={(event) => { setLeftProductId(event.target.value); setResult(null); setError(null); }} className={`${inputClass} mt-2`}>{products.map((product) => <option key={product.id} value={product.id}>{product.brand} · {product.canonicalName}</option>)}</select></label>
        <span className="pb-3 text-center font-display text-sm font-black text-cyan-300">VS</span>
        <label className="text-sm font-bold text-slate-300">Second product<select value={rightProductId} onChange={(event) => { setRightProductId(event.target.value); setResult(null); setError(null); }} className={`${inputClass} mt-2`}>{products.map((product) => <option key={product.id} value={product.id}>{product.brand} · {product.canonicalName}</option>)}</select></label>
      </div>

      {leftProductId !== rightProductId && <div className={`mt-5 rounded-2xl border p-4 ${ready ? "border-emerald-300/20 bg-emerald-300/[0.05]" : "border-amber-300/20 bg-amber-300/[0.05]"}`}>
        <div className="flex items-start gap-3">{ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /> : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />}<div><p className="font-bold text-white">{selectedExists ? "This comparison already exists." : ready ? "This matchup meets the publishing standard." : "You can save a draft, but it cannot be approved yet."}</p><p className="mt-1 text-sm text-slate-400">{selectedCoverage.sharedCoreFieldCount} of {selectedCoverage.coreFieldCount} core fields are shared ({selectedCoverage.coreCoveragePercent}%). Publishing requires 70%.</p></div></div>
      </div>}

      <Button onClick={create} disabled={Boolean(busy) || !leftProductId || !rightProductId || leftProductId === rightProductId} size="lg" className="mt-6 rounded-xl font-black">{busy ? <Loader2 className="animate-spin" /> : <Scale />} {selectedExists ? "Open workflow" : "Create draft"}</Button>
      {error && <p className="mt-4 rounded-xl bg-rose-300/10 p-3 text-sm text-rose-200">{error}</p>}
      {result && <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4"><p className="font-bold text-emerald-100">{result.duplicate ? `This comparison already exists as ${result.status.replace("_", " ")}.` : `Comparison saved as ${result.status.replace("_", " ")}.`}</p>{result.status === "published" && <Link href={`/compare/headphones/${result.slug}`} className="text-link mt-2">Open public comparison <ArrowRight className="h-4 w-4" /></Link>}</div>}
    </section>

        {existingComparisons.length > 0 && <section aria-labelledby="comparison-workflow"><h2 id="comparison-workflow" className="font-display text-2xl font-black text-white">Comparison workflow</h2><div className="mt-4 grid gap-3">{existingComparisons.map((comparison) => { const left = productById.get(comparison.leftProductId); const right = productById.get(comparison.rightProductId); if (!left || !right) return null; const nextStatus = comparison.status === "draft" ? "needs_review" : comparison.status === "needs_review" ? "approved" : comparison.status === "approved" ? "published" : null; return <article key={comparison.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-start justify-between gap-3"><p className="font-bold text-white">{left.canonicalName} <span className="text-slate-600">vs</span> {right.canonicalName}</p><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-300">{comparison.status.replace("_", " ")}</span></div><p className="mt-2 text-xs text-slate-500">{comparison.coveragePercent}% core coverage · {comparison.scoringVersion} · verdict {comparison.verdictStatus}</p><div className="mt-4 flex flex-wrap gap-2">{comparison.status === "published" && <Link href={`/compare/headphones/${comparison.slug}`} className="text-link rounded-lg border border-white/10 px-3 py-2">View live <ArrowRight className="h-4 w-4" /></Link>}{nextStatus && <Button type="button" variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => transition(comparison, nextStatus)}>{busy === `${comparison.id}:${nextStatus}` && <Loader2 className="animate-spin" />}{nextStatus === "needs_review" ? "Send to review" : nextStatus === "approved" ? "Approve comparison" : "Publish"}</Button>}{comparison.status === "approved" && <Button type="button" variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => transition(comparison, "needs_review")}>Return to review</Button>}</div><VerdictEditor comparison={comparison} leftName={left.canonicalName} rightName={right.canonicalName} onChanged={() => router.refresh()} /></article>; })}</div></section>}
  </div>;
}
