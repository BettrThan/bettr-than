"use client";

import { useState } from "react";
import { Check, ExternalLink, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { headphonePresetLabels, type HeadphonePresetKey } from "@/lib/headphone-specs";
import { parseVerdictEvidence, type VerdictEvidenceReference } from "@/lib/verdicts";

type VerdictRecord = {
  id: string;
  verdictStatus: string;
  verdictHeadline: string | null;
  verdict: string | null;
  verdictBuyLeft: string | null;
  verdictBuyRight: string | null;
  verdictEvidenceJson: string;
  verdictPreset: string | null;
  verdictScoringVersion: string | null;
};

type Copy = { headline: string; summary: string; buyLeft: string; buyRight: string };

export function VerdictEditor({ comparison, leftName, rightName, onChanged }: { comparison: VerdictRecord; leftName: string; rightName: string; onChanged: () => void }) {
  const [status, setStatus] = useState(comparison.verdictStatus);
  const [preset, setPreset] = useState<HeadphonePresetKey>((comparison.verdictPreset as HeadphonePresetKey) || "balanced");
  const [copy, setCopy] = useState<Copy>({ headline: comparison.verdictHeadline ?? "", summary: comparison.verdict ?? "", buyLeft: comparison.verdictBuyLeft ?? "", buyRight: comparison.verdictBuyRight ?? "" });
  const [evidence, setEvidence] = useState<VerdictEvidenceReference[]>(parseVerdictEvidence(comparison.verdictEvidenceJson));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [variation, setVariation] = useState(0);
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#07101f] px-3 text-sm text-white outline-none focus:border-cyan-300/60";

  const run = async (action: "generate" | "save" | "approve" | "reject") => {
    setBusy(action); setError(null); setNotice(null);
    try {
      const nextVariation = action === "generate" ? variation + 1 : variation;
      const response = await fetch(`/api/admin/comparisons/${comparison.id}/verdict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, preset, variation: nextVariation, copy }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to update the verdict.");
      if (action === "generate") {
        setVariation(nextVariation);
        setCopy({ headline: body.headline, summary: body.summary, buyLeft: body.buyLeft, buyRight: body.buyRight });
        setEvidence(body.evidence ?? []);
      }
      setStatus(body.status);
      setNotice(action === "generate" ? "Evidence-backed draft generated. Review every sentence before approval." : action === "save" ? "Draft saved." : action === "approve" ? "Verdict approved." : "Verdict rejected.");
      onChanged();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update the verdict."); }
    finally { setBusy(null); }
  };

  const set = (key: keyof Copy, value: string) => setCopy((current) => ({ ...current, [key]: value }));

  return <details className="mt-5 rounded-2xl border border-white/10 bg-[#07101f]/70 p-4">
    <summary className="cursor-pointer font-bold text-white">Editorial verdict <span className="ml-2 rounded-full bg-white/5 px-2 py-1 text-xs uppercase tracking-wider text-slate-400">{status}</span></summary>
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-44 text-sm font-bold text-slate-300">Drafting preset<select value={preset} onChange={(event) => setPreset(event.target.value as HeadphonePresetKey)} className={inputClass}>{Object.entries(headphonePresetLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => run("generate")}><RefreshCw className={busy === "generate" ? "animate-spin" : ""} />{copy.headline ? "Regenerate" : "Generate draft"}</Button>
      </div>
      <p className="text-sm leading-6 text-slate-400">Drafting uses only approved facts, scoring results, and their saved sources. It will stop when both products do not have enough distinct evidence.</p>
      {copy.headline && <>
        <label className="block text-sm font-bold text-slate-300">Playful headline<input value={copy.headline} onChange={(event) => set("headline", event.target.value)} maxLength={140} className={inputClass} /></label>
        <label className="block text-sm font-bold text-slate-300">Concise verdict<Textarea value={copy.summary} onChange={(event) => set("summary", event.target.value)} maxLength={600} className={`${inputClass} min-h-24`} /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-bold text-slate-300">Recommendation for {leftName}<Textarea value={copy.buyLeft} onChange={(event) => set("buyLeft", event.target.value)} maxLength={400} className={`${inputClass} min-h-28`} /></label>
          <label className="block text-sm font-bold text-slate-300">Recommendation for {rightName}<Textarea value={copy.buyRight} onChange={(event) => set("buyRight", event.target.value)} maxLength={400} className={`${inputClass} min-h-28`} /></label>
        </div>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4"><p className="text-xs font-black uppercase tracking-wider text-amber-300">Owner preview</p><h4 className="mt-2 text-xl font-black text-white">{copy.headline}</h4><p className="mt-2 text-sm leading-6 text-slate-300">{copy.summary}</p><div className="mt-3 grid gap-2 md:grid-cols-2"><p className="text-sm text-slate-300">{copy.buyLeft}</p><p className="text-sm text-slate-300">{copy.buyRight}</p></div></div>
        {evidence.length > 0 && <div><p className="text-sm font-bold text-white">Draft evidence</p><ul className="mt-2 grid gap-2">{evidence.map((item) => <li key={`${item.productSlug}:${item.key}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.035] px-3 py-2 text-sm"><span className="text-slate-300">{item.productName}: {item.label} — <strong className="text-white">{item.value}</strong></span><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-link">Source <ExternalLink className="h-3.5 w-3.5" /></a></li>)}</ul></div>}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => run("save")}>{busy === "save" ? <Loader2 className="animate-spin" /> : <Sparkles />}Save draft</Button><Button type="button" disabled={Boolean(busy) || status !== "draft"} onClick={() => run("approve")}>{busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />}Approve verdict</Button><Button type="button" variant="ghost" disabled={Boolean(busy)} onClick={() => run("reject")}><X />Reject</Button></div>
      </>}
      {error && <p role="alert" className="rounded-xl bg-rose-300/10 p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-300/10 p-3 text-sm text-emerald-100">{notice}</p>}
      {comparison.verdictScoringVersion && <p className="text-xs text-slate-600">Drafted with {comparison.verdictScoringVersion}</p>}
    </div>
  </details>;
}
