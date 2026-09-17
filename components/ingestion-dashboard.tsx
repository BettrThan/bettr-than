"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Headphones, Loader2, Play, Plus, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { categories } from "@/lib/categories";
import type { NormalizedFact } from "@/lib/agents/product-ingestion";
import { headphonesStarter } from "@/lib/headphones-starter";
import { ProductReviewEditor } from "@/components/product-review-editor";
import { CsvProductImporter } from "@/components/csv-product-importer";

type Job = {
  id: string; sourceUrl: string; sourceHost: string; categorySlug: string; status: string;
  canonicalName: string | null; brand: string | null; imageUrl: string | null;
  description: string | null; normalizedJson: string | null; conflictsJson: string;
  specsJson: string; specProvenanceJson: string; specConflictsJson: string;
  errorMessage: string | null; createdAt: string; updatedAt: string;
};

const statusLabel: Record<string, string> = { queued: "Queued", extracting: "Extracting", review_required: "Needs review", approved: "Published", rejected: "Rejected", failed: "Failed" };

export function IngestionDashboard({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs); const [sourceUrl, setSourceUrl] = useState("");
  const [categorySlug, setCategorySlug] = useState("smartphones"); const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const queueHeadphonesStarter = async () => {
    setBusy("starter"); setMessage(null); let added = 0; let alreadyQueued = 0;
    try {
      for (const product of headphonesStarter) {
        const response = await fetch("/api/admin/ingestion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceUrl: product.sourceUrl, categorySlug: "headphones" }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? `Unable to queue ${product.name}.`);
        if (body.duplicate) alreadyQueued += 1; else added += 1;
      }
      setCategorySlug("headphones"); await refresh();
      setMessage(`${added} Headphones source${added === 1 ? "" : "s"} queued${alreadyQueued ? `; ${alreadyQueued} already in the console` : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue the starter set.");
    } finally { setBusy(null); }
  };

  const refresh = async () => { const response = await fetch("/api/admin/ingestion", { cache: "no-store" }); if (response.ok) setJobs((await response.json()).jobs); };
  const completeEdit = async (nextMessage: string) => { setMessage(nextMessage); await refresh(); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy("submit"); setMessage(null);
    const response = await fetch("/api/admin/ingestion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceUrl, categorySlug }) }); const body = await response.json();
    if (response.ok) { setSourceUrl(""); setMessage("Source added to the queue."); await refresh(); } else setMessage(body.error ?? "Unable to add source."); setBusy(null);
  };
  const act = async (job: Job, action: "extract" | "approve" | "reject") => {
    setBusy(`${job.id}:${action}`); setMessage(null); const endpoint = action === "extract" ? `/api/admin/ingestion/${job.id}/extract` : `/api/admin/ingestion/${job.id}/review`;
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: action === "extract" ? "{}" : JSON.stringify({ decision: action }) }); const body = await response.json();
    setMessage(response.ok ? (action === "extract" ? "Extraction finished. Review the facts before publishing." : action === "approve" ? "Product approved and published." : "Candidate rejected.") : body.error ?? "Action failed."); await refresh(); setBusy(null);
  };

  return <div className="space-y-8">
    <CsvProductImporter onImported={completeEdit} />
    <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
      <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-cyan-300" /><h2 className="font-display text-xl font-black text-white">Add one approved source</h2></div>
      <p className="mt-2 text-sm leading-6 text-slate-400">Paste a public product page from a manufacturer. Retailers, marketplaces, and broad crawling are blocked.</p>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_15rem_auto]">
        <input required type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://manufacturer.com/product/..." className="min-h-11 rounded-xl border border-white/10 bg-[#07101f] px-4 text-base text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50" />
        <NativeSelect value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} className="h-11 w-full rounded-xl bg-[#07101f] text-white">{categories.map((category) => <NativeSelectOption key={category.slug} value={category.slug}>{category.name}</NativeSelectOption>)}</NativeSelect>
        <Button type="submit" size="lg" disabled={busy === "submit"} className="h-11 rounded-xl font-black">{busy === "submit" ? <Loader2 className="animate-spin" /> : <Plus />} Add source</Button>
      </div>
      {message && <p role="status" className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-3 text-sm text-cyan-100">{message}</p>}
      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 text-sm font-black text-white"><Headphones className="h-4 w-4 text-cyan-300" />Headphones starter set</p><p className="mt-1 text-sm text-slate-400">Five official manufacturer pages, ready for controlled extraction.</p></div>
          <Button type="button" variant="secondary" onClick={queueHeadphonesStarter} disabled={Boolean(busy)} className="rounded-xl">{busy === "starter" ? <Loader2 className="animate-spin" /> : <Plus />} Queue all 5</Button>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">{headphonesStarter.map((product) => <li key={product.sourceUrl} className="rounded-xl border border-white/10 bg-[#07101f]/70 px-3 py-2 text-sm text-slate-300">{product.name}</li>)}</ul>
      </div>
    </form>
    <section><div className="flex items-end justify-between gap-4"><div><p className="section-kicker">Agent activity</p><h2 className="font-display text-3xl font-black text-white">Review queue</h2></div><span className="text-sm text-slate-500">{jobs.length} recent jobs</span></div>
      <div className="mt-5 space-y-4">{jobs.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-500">No product sources have been submitted yet.</div>}{jobs.map((job) => {
        let facts: NormalizedFact[] = []; let conflicts: string[] = []; try { facts = JSON.parse(job.normalizedJson ?? "[]"); } catch {} try { conflicts = JSON.parse(job.conflictsJson ?? "[]"); } catch {}
        const extracting = busy === `${job.id}:extract`;
        return <article key={job.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wider ${job.status === "approved" ? "bg-emerald-300/15 text-emerald-200" : job.status === "failed" || job.status === "rejected" ? "bg-rose-300/15 text-rose-200" : "bg-amber-300/15 text-amber-200"}`}>{statusLabel[job.status] ?? job.status}</span><span className="text-xs text-slate-600">{job.sourceHost}</span></div><h3 className="mt-3 text-xl font-black text-white">{job.canonicalName || "Awaiting extraction"}</h3><p className="mt-1 text-sm text-slate-500">{job.brand || categories.find((category) => category.slug === job.categorySlug)?.name}</p></div><a href={job.sourceUrl} target="_blank" rel="noreferrer" className="text-link shrink-0">View source <ExternalLink className="h-4 w-4" /></a></div>
          {job.errorMessage && <p className="mt-4 rounded-xl bg-rose-300/10 p-3 text-sm text-rose-200">{job.errorMessage}</p>}
          {facts.length > 0 && <div className="mt-5 overflow-hidden rounded-xl border border-white/10">{facts.map((fact) => <div key={fact.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-3 border-b border-white/10 px-4 py-3 text-sm last:border-0"><span className="break-words text-slate-400">{fact.label}</span><strong className="break-words text-white">{fact.value}</strong><span className="text-slate-600">{Math.round(fact.confidence * 100)}%</span></div>)}</div>}
          {conflicts.length > 0 && <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4"><p className="text-sm font-black text-amber-200">Data QA flags</p><ul className="mt-2 space-y-1 text-sm text-amber-100/80">{conflicts.map((conflict) => <li key={conflict}>• {conflict}</li>)}</ul></div>}
          {job.categorySlug === "headphones" && ["failed", "review_required", "approved"].includes(job.status) && <ProductReviewEditor key={`${job.id}:${job.updatedAt}`} job={job} verifiedFactCount={facts.length} onComplete={completeEdit} />}
          <div className="mt-5 flex flex-wrap gap-2">{["queued", "failed", "review_required"].includes(job.status) && <Button onClick={() => act(job, "extract")} disabled={Boolean(busy)} variant="secondary" className="rounded-xl">{extracting ? <Loader2 className="animate-spin" /> : <Play />} {job.status === "review_required" ? "Run again" : "Run extraction"}</Button>}{job.status === "review_required" && job.categorySlug !== "headphones" && <Button onClick={() => act(job, "approve")} disabled={Boolean(busy)} className="rounded-xl font-bold"><CheckCircle2 /> Approve & publish</Button>}{job.status === "review_required" && <Button onClick={() => act(job, "reject")} disabled={Boolean(busy)} variant="destructive" className="rounded-xl"><XCircle /> Reject</Button>}</div>
        </article>;
      })}</div>
    </section>
  </div>;
}
