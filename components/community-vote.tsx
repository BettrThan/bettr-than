"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, ThumbsUp } from "lucide-react";
import { headphonePresetLabels, type HeadphonePresetKey } from "@/lib/headphone-specs";
import type { VoteDimensionType } from "@/lib/vote-contract";
import { trackDecisionEvent } from "@/lib/analytics-client";

type VoteProduct = { slug: string; shortName: string };
type AttributeOption = { key: string; label: string };
type VoteResponse = { choice?: string | null; hasVoted?: boolean; totals?: Record<string, number>; actionToken?: string; error?: string };

export function CommunityVote({ comparison, products, useCaseKey = "balanced", attributeOptions = [] }: { comparison: string; products: readonly [VoteProduct, VoteProduct]; useCaseKey?: string; attributeOptions?: AttributeOption[] }) {
  const [dimensionType, setDimensionType] = useState<VoteDimensionType>("overall");
  const [attributeKey, setAttributeKey] = useState(attributeOptions[0]?.key ?? "");
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [choice, setChoice] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [actionToken, setActionToken] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loadedDimension, setLoadedDimension] = useState("");
  const [message, setMessage] = useState("");

  const dimensionKey = dimensionType === "overall" ? "overall" : dimensionType === "use_case" ? useCaseKey : attributeKey;
  const dimensionQuery = new URLSearchParams({ dimensionType, dimensionKey }).toString();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/votes/${comparison}?${dimensionQuery}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as VoteResponse;
        if (!response.ok) throw new Error(data.error || "Voting is temporarily unavailable");
        setTotals(data.totals ?? {});
        setChoice(data.choice ?? null);
        setHasVoted(Boolean(data.hasVoted));
        setActionToken(data.actionToken ?? "");
        setLoadedDimension(dimensionQuery);
        setMessage("");
        setStatus("idle");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadedDimension(dimensionQuery);
        setMessage(error instanceof Error ? error.message : "Voting is temporarily unavailable");
        setStatus("error");
      });
    return () => controller.abort();
  }, [comparison, dimensionQuery]);

  const total = useMemo(() => Object.values(totals).reduce((sum, value) => sum + value, 0), [totals]);
  const earlyResults = hasVoted && total > 0 && total < 10;
  const loading = loadedDimension !== dimensionQuery;

  const vote = async (product: VoteProduct) => {
    if (!actionToken) return;
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/votes/${comparison}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choiceSlug: product.slug, dimensionType, dimensionKey, actionToken, website: "" }),
      });
      const data = await response.json() as VoteResponse;
      if (!response.ok) {
        if (data.actionToken) setActionToken(data.actionToken);
        throw new Error(data.error || "Vote failed");
      }
      setTotals(data.totals ?? {});
      setChoice(data.choice ?? product.slug);
      setHasVoted(true);
      setActionToken(data.actionToken ?? "");
      setStatus("saved");
      setMessage("Vote saved. You can change it anytime.");
      trackDecisionEvent("vote_completed", { comparisonSlug: comparison, presetKey: useCaseKey, metadata: { choiceSlug: product.slug, dimensionType, dimensionKey } });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Voting is temporarily unavailable");
      setStatus("error");
    }
  };

  const useCaseLabel = useCaseKey === "portability"
    ? "Portability"
    : headphonePresetLabels[useCaseKey as HeadphonePresetKey]
      ?? useCaseKey.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

  const modes: Array<{ type: VoteDimensionType; label: string; available: boolean }> = [
    { type: "overall", label: "Overall", available: true },
    { type: "use_case", label: useCaseLabel, available: attributeOptions.length > 0 },
    { type: "attribute", label: "By feature", available: attributeOptions.length > 0 },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">People&apos;s Pick</p>
          <h2 className="font-display text-2xl font-black text-white">Which one would you choose?</h2>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4" /> Protected anonymous voting</span>
      </div>

      {attributeOptions.length > 0 && <div className="mt-5 grid grid-cols-3 gap-2" role="tablist" aria-label="Voting category">
        {modes.filter((mode) => mode.available).map((mode) => <button key={mode.type} type="button" role="tab" aria-selected={dimensionType === mode.type} onClick={() => setDimensionType(mode.type)} className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${dimensionType === mode.type ? "border-cyan-300 bg-cyan-300 text-[#07101f]" : "border-white/10 bg-[#07101f] text-slate-300"}`}>{mode.label}</button>)}
      </div>}

      {dimensionType === "attribute" && attributeOptions.length > 0 && <label className="mt-4 block text-sm font-bold text-slate-300">Feature<select value={attributeKey} onChange={(event) => setAttributeKey(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#07101f] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{attributeOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-busy={loading || status === "saving"}>
        {products.map((product) => {
          const votesForProduct = totals[product.slug] ?? 0;
          const percent = hasVoted && total ? Math.round((votesForProduct / total) * 100) : null;
          return <button key={product.slug} type="button" disabled={!actionToken || loading || status === "saving"} onClick={() => vote(product)} className={`relative min-h-24 overflow-hidden rounded-2xl border p-5 text-left transition hover:border-cyan-300/50 disabled:opacity-60 ${choice === product.slug ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-[#07101f]"}`}>
            {percent != null && <span className="absolute inset-y-0 left-0 bg-cyan-300/5" style={{ width: `${percent}%` }} />}
            <span className="relative flex items-center justify-between gap-3"><span><span className="block text-sm font-bold text-white">{product.shortName}</span><span className="mt-1 block text-xs text-slate-500">{hasVoted ? `${votesForProduct} ${votesForProduct === 1 ? "vote" : "votes"}` : "Choose this product"}</span></span><span className="flex items-center gap-2 font-display text-2xl font-black text-cyan-200">{percent == null ? <ThumbsUp className="h-5 w-5" /> : <>{percent}% <ThumbsUp className="h-4 w-4" /></>}</span></span>
          </button>;
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
        <p className={status === "error" ? "text-rose-300" : "text-slate-500"}>{loading ? "Loading voting options…" : message || (hasVoted ? `${total.toLocaleString()} total ${total === 1 ? "vote" : "votes"}. You can change your choice.` : "Vote to reveal the community results.")}</p>
        {earlyResults && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-200">Early results</span>}
      </div>
    </section>
  );
}
