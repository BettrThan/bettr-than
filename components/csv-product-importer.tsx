"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseProductCsv, type CsvProductInput, type CsvProductPreview } from "@/lib/csv-product-import";

type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ rowNumber: number; product: string; error: string }>;
};

export function CsvProductImporter({ onImported }: { onImported: (message: string) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CsvProductPreview[]>([]);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const validRows = rows.filter((row) => row.errors.length === 0);
  const invalidRows = rows.filter((row) => row.errors.length > 0);

  const chooseFile = async (file: File | undefined) => {
    setNotice(null);
    setResult(null);
    setRows([]);
    setFileName(file?.name ?? "");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setNotice({ kind: "error", message: "Choose a .csv file." });
      return;
    }
    if (file.size > 512_000) {
      setNotice({ kind: "error", message: "The CSV is larger than the 500 KB import limit." });
      return;
    }
    try {
      setRows(parseProductCsv(await file.text()));
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Unable to read this CSV." });
    }
  };

  const importProducts = async () => {
    if (!validRows.length) return;
    setBusy(true);
    setNotice(null);
    setResult(null);
    try {
      const payloadRows: CsvProductInput[] = validRows.map((row) => ({
        rowNumber: row.rowNumber,
        canonicalName: row.canonicalName,
        brand: row.brand,
        sourceUrl: row.sourceUrl,
        imageUrl: row.imageUrl,
        description: row.description,
        notes: row.notes,
        specs: row.specs,
      }));
      const response = await fetch("/api/admin/ingestion/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payloadRows }),
      });
      const body = await response.json() as ImportResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to import products.");
      setResult(body);
      const summary = `${body.imported} product${body.imported === 1 ? "" : "s"} published${body.updated ? `; ${body.updated} existing product${body.updated === 1 ? "" : "s"} updated` : ""}${body.skipped ? `; ${body.skipped} skipped` : ""}.`;
      setNotice({ kind: "success", message: summary });
      await onImported(summary);
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Unable to import products." });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setRows([]);
    setFileName("");
    setResult(null);
    setNotice(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.035] p-5 sm:p-7" aria-labelledby="csv-import-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-3"><FileSpreadsheet className="h-5 w-5 text-cyan-300" /><h2 id="csv-import-title" className="font-display text-xl font-black text-white">Import products from CSV</h2></div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Upload the Product Data sheet as a CSV. Valid rows publish together; invalid rows stay out and show exactly what needs fixing.</p>
      </div>
      <a href="/templates/headphones-product-import.csv" download className="text-link shrink-0 rounded-xl border border-white/10 px-4 py-2"><Download className="h-4 w-4" /> CSV template</a>
    </div>

    <div className="mt-5 rounded-2xl border border-dashed border-white/20 bg-[#07101f]/70 p-5">
      <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={(event) => chooseFile(event.target.files?.[0])} className="sr-only" id="product-csv-upload" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-bold text-white">{fileName || "Choose a Headphones CSV"}</p><p className="mt-1 text-sm text-slate-500">Up to 100 products or 500 KB. CSV files only.</p></div>
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} className="rounded-xl"><Upload /> {fileName ? "Choose another file" : "Choose CSV"}</Button>
      </div>
    </div>

    {rows.length > 0 && <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm font-bold"><span className="rounded-full bg-white/5 px-3 py-1.5 text-white">{rows.length} rows</span><span className="rounded-full bg-emerald-300/10 px-3 py-1.5 text-emerald-200">{validRows.length} ready</span>{invalidRows.length > 0 && <span className="rounded-full bg-rose-300/10 px-3 py-1.5 text-rose-200">{invalidRows.length} need fixes</span>}</div>
        <Button type="button" variant="ghost" onClick={reset} className="text-slate-400 hover:text-white">Clear file</Button>
      </div>

      <div className="mt-4 max-h-[28rem] overflow-auto rounded-2xl border border-white/10">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[#0d1b2e]"><TableRow className="border-white/10 hover:bg-transparent"><TableHead className="text-slate-400">Row</TableHead><TableHead className="min-w-64 text-slate-400">Product</TableHead><TableHead className="text-slate-400">Brand</TableHead><TableHead className="text-slate-400">Specs</TableHead><TableHead className="min-w-72 text-slate-400">Validation</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((row) => <TableRow key={`${row.rowNumber}:${row.canonicalName}`} className="border-white/10 hover:bg-white/[0.025]"><TableCell className="text-slate-500">{row.rowNumber}</TableCell><TableCell className="font-bold text-white">{row.canonicalName || "Unnamed product"}</TableCell><TableCell className="text-slate-300">{row.brand || "—"}</TableCell><TableCell className="text-slate-300">{row.specCount}</TableCell><TableCell className="whitespace-normal">{row.errors.length === 0 ? <span className="inline-flex items-center gap-2 font-bold text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Ready to publish</span> : <span className="inline-flex items-start gap-2 text-rose-200"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {row.errors.join(" ")}</span>}</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" onClick={importProducts} disabled={busy || validRows.length === 0} className="rounded-xl font-black">{busy ? <Loader2 className="animate-spin" /> : <Upload />} Import and publish {validRows.length} product{validRows.length === 1 ? "" : "s"}</Button>
        {invalidRows.length > 0 && <p className="text-sm text-slate-500">Rows with errors will not be submitted.</p>}
      </div>
    </div>}

    {notice && <p role="status" aria-live="polite" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${notice.kind === "error" ? "border-rose-300/20 bg-rose-300/[0.08] text-rose-100" : "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100"}`}>{notice.message}</p>}
    {result && result.errors.length > 0 && <ul className="mt-3 space-y-1 text-sm text-rose-200">{result.errors.map((item) => <li key={`${item.rowNumber}:${item.product}`}>Row {item.rowNumber} · {item.product}: {item.error}</li>)}</ul>}
  </section>;
}
