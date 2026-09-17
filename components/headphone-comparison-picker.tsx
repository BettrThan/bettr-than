"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Headphones, Search, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { comparisonPairKey } from "@/lib/comparison-discovery";
import { extendedCategoryModels } from "@/lib/extended-category-specs";
import { trackDecisionEvent } from "@/lib/analytics-client";

export type ProductOption = { id: string; slug: string; canonicalName: string; brand: string };
export type ComparisonOption = { id: string; slug: string; leftProductId: string; rightProductId: string; coveragePercent: number; verdictStatus: string; href?: string };

function ProductCombobox({ label, products, value, excluded, onChange, category = "headphones" }: { label: string; products: ProductOption[]; value: string; excluded: string; onChange: (value: string) => void; category?: string }) {
  const available = products.filter((product) => product.id !== excluded);
  const selected = products.find((product) => product.id === value) ?? null;
  return <label className="block min-w-0 text-sm font-bold text-slate-300"><span className="mb-2 block">{label}</span><Combobox items={available} value={selected} onValueChange={(next) => next && onChange((next as ProductOption).id)} itemToStringLabel={(item) => item.canonicalName} itemToStringValue={(item) => item.id}><ComboboxInput placeholder={`Search approved ${category}`} aria-label={label} className="min-h-12 w-full border-white/10 bg-white/[0.045] text-white" showClear={false} /><ComboboxContent className="border-white/10 bg-[#111c2d] text-white"><ComboboxEmpty>No approved product matches.</ComboboxEmpty><ComboboxList>{(product: ProductOption) => <ComboboxItem key={product.id} value={product} className="py-3 data-highlighted:bg-white/10"><span><span className="block text-xs uppercase tracking-wider text-cyan-300">{product.brand}</span><span className="font-semibold">{product.canonicalName}</span></span></ComboboxItem>}</ComboboxList></ComboboxContent></Combobox></label>;
}

export function HeadphoneComparisonPicker({ products, comparisons, dataUnavailable = false, category = "headphones", initialLeftId, initialRightId, compact = false }: { products: ProductOption[]; comparisons: ComparisonOption[]; dataUnavailable?: boolean; category?: "headphones" | "smartphones" | "portable-speakers" | "vr-headsets" | "wearables" | "game-consoles"; initialLeftId?: string; initialRightId?: string; compact?: boolean }) {
  const initial = comparisons[0];
  const [leftId, setLeftId] = useState(initialLeftId ?? initial?.leftProductId ?? products[0]?.id ?? "");
  const [rightId, setRightId] = useState(initialRightId ?? initial?.rightProductId ?? products[1]?.id ?? "");
  const started = useRef(false);
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const comparisonsByPair = useMemo(() => new Map(comparisons.map((comparison) => [comparisonPairKey(comparison.leftProductId, comparison.rightProductId), comparison])), [comparisons]);
  const match = comparisonsByPair.get(comparisonPairKey(leftId, rightId));
  const alternatives = comparisons.filter((comparison) => comparison.leftProductId === leftId || comparison.rightProductId === leftId || comparison.leftProductId === rightId || comparison.rightProductId === rightId).filter((comparison) => comparison.id !== match?.id).slice(0, 3);

  const startPicker = () => { if (started.current) return; started.current = true; trackDecisionEvent("picker_started", { categorySlug: category }); };
  useEffect(() => {
    if (dataUnavailable || products.length < 2 || comparisons.length === 0) trackDecisionEvent("comparison_zero_results", { categorySlug: category });
  }, [comparisons.length, dataUnavailable, products.length, category]);
  useEffect(() => {
    if (started.current && leftId && rightId && !match) trackDecisionEvent("matchup_unavailable", { categorySlug: category, productIds: [leftId, rightId] });
  }, [leftId, match, rightId, category]);

  const swap = () => { setLeftId(rightId); setRightId(leftId); };
  if (dataUnavailable) return <section className="comparison-shell p-6 sm:p-8" role="status"><Headphones className="h-7 w-7 text-amber-300" /><h2 className="mt-4 font-display text-2xl font-black text-white">Comparisons are temporarily unavailable</h2><p className="mt-2 text-slate-400">The catalog could not reconnect. Refresh in a moment; no product data has been changed.</p></section>;
  if (products.length < 2) return <section className="comparison-shell p-6 sm:p-8"><Headphones className="h-7 w-7 text-cyan-300" /><h2 className="mt-4 font-display text-2xl font-black text-white">{category === "headphones" ? "Headphones" : category === "smartphones" ? "Smartphones" : extendedCategoryModels[category].name} comparisons are being prepared</h2><p className="mt-2 text-slate-400">Approved products will appear here as soon as two are ready.</p></section>;

  return <section className="comparison-shell p-5 sm:p-7" aria-labelledby={`${category}-picker-heading`} onFocusCapture={startPicker} onPointerDownCapture={startPicker}>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="section-kicker"><Search className="mr-2 inline h-4 w-4" />Compare {category}</p>{compact ? <h1 id={`${category}-picker-heading`} className="mt-1 text-xl font-bold text-white">Choose products to compare</h1> : <h2 id={`${category}-picker-heading`} className="mt-1 font-display text-3xl font-black text-white">Pick two. See what&apos;s better.</h2>}</div><Button type="button" variant="ghost" onClick={swap} disabled={!leftId || !rightId}><Shuffle /> Swap sides</Button></div>
    <div className="comparison-picker-fields mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end"><ProductCombobox label="First product" products={products} value={leftId} excluded={rightId} onChange={setLeftId} category={category} /><div className="comparison-picker-separator mx-auto mb-1 grid h-11 w-11 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 font-black text-cyan-200">VS</div><ProductCombobox label="Second product" products={products} value={rightId} excluded={leftId} onChange={setRightId} category={category} /></div>
    {match ? <Link href={match.href ?? `/compare/${category}/${match.slug}`} onClick={() => trackDecisionEvent("picker_completed", { categorySlug: category, comparisonSlug: match.slug, productIds: [leftId, rightId] })} className="primary-action mt-6">Open comparison <ArrowRight className="h-5 w-5" /></Link> : <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4"><p className="font-bold text-white">That matchup is not published yet.</p><p className="mt-1 text-sm text-slate-400">Choose another pair or open one of these complete comparisons.</p>{alternatives.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{alternatives.map((comparison) => { const left = productsById.get(comparison.leftProductId); const right = productsById.get(comparison.rightProductId); if (!left || !right) return null; return <Link key={comparison.id} href={comparison.href ?? `/compare/${category}/${comparison.slug}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-cyan-200 hover:border-cyan-300/40">{left.canonicalName} vs {right.canonicalName}</Link>; })}</div> : <Link href={`/category/${category}`} className="text-link mt-3">Browse published comparisons <ArrowRight className="h-4 w-4" /></Link>}</div>}
  </section>;
}
