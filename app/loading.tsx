export default function Loading() {
  return <main className="min-h-screen bg-[#07101f] px-4 py-16 text-white" aria-busy="true" aria-live="polite"><div className="mx-auto max-w-6xl"><p className="section-kicker">Loading verified data</p><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="h-40 animate-pulse rounded-3xl bg-white/[0.05]" /><div className="h-40 animate-pulse rounded-3xl bg-white/[0.05]" /></div><p className="mt-5 text-sm text-slate-400">Preparing the comparison experience…</p></div></main>;
}
