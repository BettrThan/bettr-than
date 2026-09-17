import Link from "next/link";
import { Database, Search, SlidersHorizontal, BookOpen, Trophy } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07101f]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Bettr Than home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400 font-black text-[#07101f]">
            BT
          </span>
          <span className="font-display text-xl font-black tracking-tight text-white">
            Bettr <span className="text-cyan-300">Than</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <Link className="nav-link" href="/find" aria-label="Find your match">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Find my match</span>
          </Link>
          <Link className="nav-link" href="/categories" aria-label="Explore categories">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Explore</span>
          </Link>
          <Link className="nav-link" href="/catalog" aria-label="Product catalog">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Catalog</span>
          </Link>
          <Link className="nav-link" href="/rankings" aria-label="Product rankings">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Rankings</span>
          </Link>
          <Link className="nav-link" href="/guides" aria-label="Buying guides">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Guides</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
