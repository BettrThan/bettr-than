"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  headphoneFields,
  parseHeadphoneSpecs,
  parseProductSpecConflicts,
  parseProductSpecProvenance,
  type HeadphoneSpecKey,
  type HeadphoneSpecs,
  type ProductSpecProvenance,
  type ProductSpecSourceType,
  type ProductSpecVerificationStatus,
} from "@/lib/headphone-specs";

type EditableJob = {
  id: string;
  sourceUrl: string;
  status: string;
  canonicalName: string | null;
  brand: string | null;
  imageUrl: string | null;
  description: string | null;
  specsJson: string;
  specProvenanceJson: string;
  specConflictsJson: string;
};

export function ProductReviewEditor({ job, verifiedFactCount, onComplete }: { job: EditableJob; verifiedFactCount: number; onComplete: (message: string) => Promise<void> }) {
  const [canonicalName, setCanonicalName] = useState(job.canonicalName ?? "");
  const [brand, setBrand] = useState(job.brand ?? "");
  const [imageUrl, setImageUrl] = useState(job.imageUrl ?? "");
  const [description, setDescription] = useState(job.description ?? "");
  const [specs, setSpecs] = useState<HeadphoneSpecs>(() => parseHeadphoneSpecs(job.specsJson));
  const [provenance, setProvenance] = useState<ProductSpecProvenance>(() => parseProductSpecProvenance(job.specProvenanceJson));
  const [busy, setBusy] = useState<"save" | "approve" | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const specCount = Object.values(specs).filter(Boolean).length;
  const unresolvedConflicts = parseProductSpecConflicts(job.specConflictsJson).filter((conflict) => conflict.resolution === "pending");
  const unverifiedCount = Object.values(provenance).filter((entry) => entry && entry.status !== "verified").length;

  const approvalIssue = !canonicalName.trim()
    ? "Enter the product name before publishing."
    : !brand.trim()
      ? "Enter the brand before publishing."
      : verifiedFactCount === 0 && specCount < 3
        ? `Add at least three verified specifications before publishing (${specCount}/3 complete).`
        : unverifiedCount > 0
          ? `Mark every entered specification as verified (${unverifiedCount} still need review).`
        : null;

  const updateSpec = (key: HeadphoneSpecKey, value: string) => {
    setSpecs((current) => ({ ...current, [key]: value || undefined }));
    if (!value) {
      setProvenance((current) => { const next = { ...current }; delete next[key]; return next; });
      return;
    }
    setProvenance((current) => ({
      ...current,
      [key]: {
        sourceUrl: job.sourceUrl,
        sourceType: "manufacturer",
        retrievedAt: new Date().toISOString(),
        confidence: 0.98,
        status: "verified",
        rawValue: value,
        normalizedValue: value,
        unit: null,
        notes: null,
        ...current[key],
      },
    }));
  };

  const updateProvenance = (key: HeadphoneSpecKey, update: Partial<NonNullable<ProductSpecProvenance[HeadphoneSpecKey]>>) => {
    setProvenance((current) => ({
      ...current,
      [key]: {
        sourceUrl: job.sourceUrl,
        sourceType: "manufacturer",
        retrievedAt: new Date().toISOString(),
        confidence: 0.98,
        status: "verified",
        rawValue: specs[key] ?? "",
        normalizedValue: specs[key] ?? "",
        unit: null,
        notes: null,
        ...current[key],
        ...update,
      },
    }));
  };

  const submit = async (decision: "save" | "approve") => {
    setNotice(null);
    if (decision === "approve" && approvalIssue) {
      setNotice({ kind: "error", message: approvalIssue });
      return;
    }
    setBusy(decision);
    try {
      const response = await fetch(`/api/admin/ingestion/${job.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, canonicalName, brand, imageUrl, description, specs, provenance }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save product.");
      const successMessage = body.requiresConfirmation
        ? `${body.conflictCount} changed specification${body.conflictCount === 1 ? "" : "s"} saved for review. Confirm them before the published product changes.`
        : decision === "approve" ? "Product approved and published." : "Changes saved.";
      setNotice({ kind: "success", message: successMessage });
      await onComplete(successMessage);
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Unable to save product." });
    } finally {
      setBusy(null);
    }
  };

  const inputClass = "mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#07101f] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50";

  return <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4 sm:p-5">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-black text-white">Headphones data model</p><p className="text-xs leading-5 text-slate-500">Verify each value against the official source. Blank fields are excluded from scoring.</p></div>
      <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">{specCount} fields complete</span>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-bold text-slate-400">Product name<input value={canonicalName} onChange={(event) => setCanonicalName(event.target.value)} className={inputClass} placeholder="Sony WH-1000XM6" /></label>
      <label className="text-xs font-bold text-slate-400">Brand<input value={brand} onChange={(event) => setBrand(event.target.value)} className={inputClass} placeholder="Sony" /></label>
      <label className="text-xs font-bold text-slate-400 sm:col-span-2">Official product image URL<input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} className={inputClass} placeholder="https://manufacturer.com/product-image.jpg" /></label>
      <label className="text-xs font-bold text-slate-400 sm:col-span-2">Short description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} min-h-24 py-3`} maxLength={600} /></label>
    </div>
    {unresolvedConflicts.length > 0 && <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-100"><strong>{unresolvedConflicts.length} specification change{unresolvedConflicts.length === 1 ? "" : "s"} awaiting confirmation.</strong> Review the proposed values and choose Approve &amp; publish to replace the currently published facts.</div>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {headphoneFields.map((field) => {
        const entry = provenance[field.key];
        const value = specs[field.key] ?? "";
        return <fieldset key={field.key} className="rounded-xl border border-white/10 p-3">
          <label className="text-xs font-bold text-slate-400">{field.label}{field.unit && <span className="font-normal text-slate-600"> ({field.unit})</span>}
            {field.kind === "boolean" ? <select value={value} onChange={(event) => updateSpec(field.key, event.target.value)} className={inputClass}><option value="">Not verified</option><option value="yes">Yes</option><option value="no">No</option><option value="not_applicable">Not applicable</option></select> : <input type={field.kind === "number" ? "text" : "text"} value={value === "not_applicable" ? "Not applicable" : value} onChange={(event) => updateSpec(field.key, event.target.value)} className={inputClass} placeholder={field.placeholder} />}
          </label>
          {value && <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_10rem]">
            <label className="text-xs font-bold text-slate-500">Fact source<input type="url" value={entry?.sourceUrl ?? job.sourceUrl} onChange={(event) => updateProvenance(field.key, { sourceUrl: event.target.value })} className={`${inputClass} min-h-9`} /></label>
            <label className="text-xs font-bold text-slate-500">Source type<select value={entry?.sourceType ?? "manufacturer"} onChange={(event) => updateProvenance(field.key, { sourceType: event.target.value as ProductSpecSourceType })} className={`${inputClass} min-h-9`}><option value="manufacturer">Manufacturer</option><option value="independent">Independent</option>{field.key === "price_usd" && <option value="retailer">Retailer</option>}<option value="owner">Owner verified</option></select></label>
            <label className="text-xs font-bold text-slate-500 sm:col-span-2">Verification<select value={entry?.status ?? "verified"} onChange={(event) => updateProvenance(field.key, { status: event.target.value as ProductSpecVerificationStatus })} className={`${inputClass} min-h-9`}><option value="verified">Verified</option><option value="needs_review">Needs review</option><option value="conflicted">Conflict</option></select></label>
          </div>}
        </fieldset>;
      })}
    </div>
    <div className="mt-6 flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={() => submit("save")} disabled={Boolean(busy)} className="rounded-xl">{busy === "save" ? <Loader2 className="animate-spin" /> : <Save />} {job.status === "approved" ? "Save published changes" : "Save review draft"}</Button>
      {job.status !== "approved" && <Button type="button" onClick={() => submit("approve")} disabled={Boolean(busy)} className="rounded-xl font-bold">{busy === "approve" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Approve & publish</Button>}
    </div>
    {job.status !== "approved" && approvalIssue && !notice && <p className="mt-3 text-sm text-amber-200">Before publishing: {approvalIssue}</p>}
    {notice && <p role="status" aria-live="polite" className={`mt-3 rounded-xl border px-4 py-3 text-sm ${notice.kind === "error" ? "border-rose-300/20 bg-rose-300/[0.08] text-rose-100" : "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100"}`}>{notice.message}</p>}
  </div>;
}
