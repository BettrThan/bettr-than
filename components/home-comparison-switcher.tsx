"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Gamepad2, Headphones, Speaker, Smartphone, Watch, Glasses } from "lucide-react";
import { HeadphoneComparisonPicker } from "@/components/headphone-comparison-picker";

export type HomeComparisonCategory = "headphones" | "smartphones" | "portable-speakers" | "vr-headsets" | "wearables" | "game-consoles";
type ProductOption = { id: string; slug: string; canonicalName: string; brand: string };
type ComparisonOption = { id: string; slug: string; leftProductId: string; rightProductId: string; coveragePercent: number; verdictStatus: string };
type CategoryData = { products: ProductOption[]; comparisons: ComparisonOption[]; dataUnavailable: boolean };

const options = [
  { key: "headphones", label: "Headphones", icon: Headphones },
  { key: "smartphones", label: "Smartphones", icon: Smartphone },
  { key: "portable-speakers", label: "Speakers", icon: Speaker },
  { key: "vr-headsets", label: "VR", icon: Glasses },
  { key: "wearables", label: "Wearables", icon: Watch },
  { key: "game-consoles", label: "Gaming", icon: Gamepad2 },
] as const;

const carouselOptions = Array.from({ length: 3 }, (_, copy) =>
  options.map((option, logicalIndex) => ({ ...option, copy, logicalIndex })),
).flat();

export function HomeComparisonSwitcher({ data }: { data: Record<HomeComparisonCategory,CategoryData> }) {
  const [selected, setSelected] = useState(data.headphones.dataUnavailable && !data.smartphones.dataUnavailable ? 1 : 0);
  const selectedRef = useRef(selected);
  const viewport = useRef<HTMLDivElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const primaryTabs = useRef<Array<HTMLButtonElement | null>>([]);
  const physicalIndexRef = useRef(options.length + selected);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const category = options[selected].key;
  const active = data[category];

  const center = useCallback((physicalIndex: number, animate: boolean) => {
    const row = viewport.current, tab = tabs.current[physicalIndex];
    if (!row || !tab) return;
    // Scroll only this row, so changing categories cannot move the page vertically.
    const left = row.scrollLeft + tab.getBoundingClientRect().left - row.getBoundingClientRect().left - (row.clientWidth - tab.offsetWidth) / 2;
    row.scrollTo({ left, behavior: animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant" });
  }, []);

  const selectPhysical = (physicalIndex: number, focus = false) => {
    const boundedIndex = Math.max(0, Math.min(carouselOptions.length - 1, physicalIndex));
    const logicalIndex = boundedIndex % options.length;
    physicalIndexRef.current = boundedIndex;
    selectedRef.current = logicalIndex;
    setSelected(logicalIndex);
    if (focus) primaryTabs.current[logicalIndex]?.focus({ preventScroll: true });
    center(boundedIndex, true);
  };

  useLayoutEffect(() => {
    const row = viewport.current;
    if (!row) return;
    const settle = () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      const box = row.getBoundingClientRect(), midpoint = box.left + row.clientWidth / 2;
      let nearest = 0, distance = Infinity;
      tabs.current.forEach((tab, index) => {
        if (!tab) return;
        const rect = tab.getBoundingClientRect(), nextDistance = Math.abs(rect.left + rect.width / 2 - midpoint);
        if (nextDistance < distance) { nearest = index; distance = nextDistance; }
      });
      const logicalIndex = nearest % options.length;
      physicalIndexRef.current = nearest;
      selectedRef.current = logicalIndex;
      setSelected(logicalIndex);

      // The outer copies make the carousel appear continuous. Once a duplicate
      // settles in the center, jump to the identical middle copy so swiping can
      // continue in either direction without exposing an empty edge.
      const normalized = nearest < options.length
        ? nearest + options.length
        : nearest >= options.length * 2
          ? nearest - options.length
          : nearest;
      if (normalized !== nearest) {
        requestAnimationFrame(() => {
          physicalIndexRef.current = normalized;
          center(normalized, false);
        });
      }
    };
    // Debounce also covers browsers without scrollend support. Content changes
    // only after scrolling settles, rather than flashing through every category.
    const onScroll = () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, 160);
    };
    row.addEventListener("scroll", onScroll, { passive: true });
    row.addEventListener("scrollend", settle);
    const resize = new ResizeObserver(() => center(physicalIndexRef.current, false));
    resize.observe(row);
    tabs.current.forEach((tab) => { if (tab) resize.observe(tab); });
    center(physicalIndexRef.current, false);
    return () => {
      row.removeEventListener("scroll", onScroll);
      row.removeEventListener("scrollend", settle);
      resize.disconnect();
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [center]);

  return <div className="min-w-0">
    <div className="relative mb-2 rounded-2xl border border-white/10 bg-[#0b1626]">
      <div ref={viewport} role="tablist" aria-label="Comparison category" aria-orientation="horizontal"
        className="relative overflow-x-auto overscroll-x-contain rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory [--category-width:7.5rem] sm:[--category-width:8.5rem]">
        <div role="presentation" className="flex w-full items-center gap-2 py-3">
          {carouselOptions.map(({ key, label, icon: Icon, copy, logicalIndex }, physicalIndex) => {
            const primary = copy === 1;
            return <button
            key={`${copy}-${key}`} ref={(element) => {
              tabs.current[physicalIndex] = element;
              if (primary) primaryTabs.current[logicalIndex] = element;
            }} type="button" role={primary ? "tab" : undefined}
            id={primary ? `home-${key}-tab` : undefined} aria-selected={primary ? selected === logicalIndex : undefined}
            aria-hidden={primary ? undefined : true} tabIndex={primary && selected === logicalIndex ? 0 : -1}
            aria-controls={primary ? `home-${key}-comparisons` : undefined} onClick={() => selectPhysical(physicalIndex)}
            onKeyDown={(event) => {
              if (!primary) return;
              const next = event.key === "Home" ? options.length : event.key === "End" ? options.length * 2 - 1 : event.key === "ArrowRight" ? physicalIndex + 1 : event.key === "ArrowLeft" ? physicalIndex - 1 : null;
              if (next === null) return;
              event.preventDefault(); selectPhysical(next, true);
            }}
            className={`flex min-h-20 shrink-0 basis-[var(--category-width)] snap-center flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${selected === logicalIndex ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-200" : "border-transparent text-slate-400 hover:bg-white/[.06] hover:text-white"}`}
          >
            <Icon aria-hidden="true" className={`h-6 w-6 transition-transform motion-reduce:transition-none ${selected === logicalIndex ? "scale-110" : "scale-90"}`} />
            <span className="whitespace-nowrap">{label}</span>
          </button>})}
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-2xl bg-gradient-to-r from-[#0b1626] to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l from-[#0b1626] to-transparent" />
      <button type="button" aria-label="Previous category" aria-controls="home-category-panel" onClick={() => selectPhysical(physicalIndexRef.current - 1)} className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#0b1626]/95 text-slate-200 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-200"><ChevronLeft aria-hidden="true" className="h-5 w-5" /></button>
      <button type="button" aria-label="Next category" aria-controls="home-category-panel" onClick={() => selectPhysical(physicalIndexRef.current + 1)} className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#0b1626]/95 text-slate-200 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-200"><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
    </div>
    <div aria-hidden="true" className="mb-4 flex justify-center gap-1.5">{options.map(({key}, index) => <span key={key} className={`h-1 rounded-full transition-[width,background-color] motion-reduce:transition-none ${selected === index ? "w-5 bg-cyan-300" : "w-1 bg-slate-600"}`} />)}</div>
    <div id="home-category-panel">
      {options.map(({key}, index) => <div key={key} role="tabpanel" id={`home-${key}-comparisons`} aria-labelledby={`home-${key}-tab`} hidden={selected !== index} tabIndex={0}>
        {selected === index && <HeadphoneComparisonPicker key={key} products={active.products} comparisons={active.comparisons} dataUnavailable={active.dataUnavailable} category={category} />}
      </div>)}
    </div>
  </div>;
}
