"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Search, Shuffle, Trophy } from "lucide-react";
import { ProductMark } from "@/components/product-mark";
import { comparisonSlug, products, scoreComparison, type Product } from "@/lib/products";

function ProductPicker({
  label,
  value,
  onChange,
  excluded,
}: {
  label: string;
  value: Product;
  onChange: (product: Product) => void;
  excluded: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-left transition hover:border-cyan-300/45 hover:bg-white/[0.08]"
      >
        <ProductMark product={value} size="small" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">{value.brand}</span>
          <span className="block truncate font-bold text-white">{value.shortName}</span>
        </span>
        <ChevronDown className={`h-5 w-5 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#111c2d] p-2 shadow-2xl">
          {products.filter((product) => product.slug !== excluded).map((product) => (
            <button
              type="button"
              key={product.slug}
              onClick={() => {
                onChange(product);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/10"
            >
              <ProductMark product={product} size="small" />
              <span className="flex-1">
                <span className="block text-xs text-slate-500">{product.brand}</span>
                <span className="font-semibold text-white">{product.shortName}</span>
              </span>
              {product.slug === value.slug && <Check className="h-4 w-4 text-cyan-300" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComparisonWorkspace() {
  const [left, setLeft] = useState(products[0]);
  const [right, setRight] = useState(products[1]);
  const [query, setQuery] = useState("");
  const result = useMemo(() => scoreComparison(left, right), [left, right]);
  const pairSlug = comparisonSlug(left, right);
  const searched = products.filter((product) =>
    `${product.brand} ${product.name}`.toLowerCase().includes(query.toLowerCase()),
  );

  const randomize = () => {
    const possible = products.filter((product) => product.slug !== left.slug);
    setRight(possible[Math.floor(Math.random() * possible.length)]);
  };

  return (
    <section className="comparison-shell" aria-labelledby="comparison-title">
      <div className="comparison-topbar">
        <div>
          <span className="status-dot" />
          <span>Live comparison lab</span>
        </div>
        <button type="button" onClick={randomize} className="mini-action">
          <Shuffle className="h-4 w-4" /> Surprise me
        </button>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        <ProductPicker label="Contender one" value={left} onChange={setLeft} excluded={right.slug} />
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 font-black text-cyan-200">
          VS
        </div>
        <ProductPicker label="Contender two" value={right} onChange={setRight} excluded={left.slug} />
      </div>

      <div className="mx-4 grid overflow-hidden rounded-2xl border border-white/10 bg-[#07101f] sm:mx-6 sm:grid-cols-[1fr_auto_1fr]">
        <div className="p-5 text-center sm:text-left">
          <span className="text-4xl font-black text-white">{result.scoreA}</span>
          <span className="ml-1 text-sm text-slate-500">/ 100</span>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{left.shortName}</p>
        </div>
        <div className="flex items-center justify-center border-y border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-300 sm:border-x sm:border-y-0">
          <Trophy className="mr-2 h-4 w-4" />
          {result.winner?.shortName ?? "Tie"} wins
        </div>
        <div className="p-5 text-center sm:text-right">
          <span className="text-4xl font-black text-white">{result.scoreB}</span>
          <span className="ml-1 text-sm text-slate-500">/ 100</span>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{right.shortName}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:p-6">
        <Link href={`/compare/${pairSlug}`} className="primary-action">
          See the full comparison <ArrowRight className="h-5 w-5" />
        </Link>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search launch products"
            aria-label="Search products"
            className="w-full rounded-xl border border-white/10 bg-white/[0.045] py-3 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50"
          />
          {query && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 rounded-xl border border-white/10 bg-[#111c2d] p-2 shadow-2xl">
              {searched.length ? searched.map((product) => (
                <Link key={product.slug} href={`/product/${product.slug}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/10">
                  <ProductMark product={product} size="small" />
                  <span className="font-semibold text-white">{product.name}</span>
                </Link>
              )) : <p className="p-3 text-sm text-slate-400">No launch products match that search yet.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
