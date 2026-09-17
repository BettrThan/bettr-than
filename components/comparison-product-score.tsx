export function ComparisonProductScore({ score, eligible, preset }: { score: number | null; eligible: boolean; preset: string }) {
  const available=eligible&&score!==null&&Number.isFinite(score);
  return <div className="mt-auto pt-6 text-center" data-product-score>
    <div className="border-t border-white/10 pt-5">
      <p className="text-sm font-semibold text-slate-400">Bettr Than Score · {preset}</p>
      <p className="font-display text-4xl font-black text-white" aria-label={available ? `${score} out of 100` : "Score unavailable"}>{available ? score : "—"}<span className="text-base text-slate-500">/100</span></p>
    </div>
  </div>;
}
