import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { ArrowLeft, BarChart3, LockKeyhole, Scale, Store } from "lucide-react";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { IngestionDashboard } from "@/components/ingestion-dashboard";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db";
import { ingestionJobs } from "@/db/schema";
import { isAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Product Agent Console", robots: { index: false, follow: false } };

export default async function IngestionAdminPage() {
  const user = await requireChatGPTUser("/admin/ingestion");
  if (!(await isAdminUser(user))) notFound();
  const jobs = await getDb().select().from(ingestionJobs).orderBy(desc(ingestionJobs.createdAt)).limit(50);
  return <main className="min-h-screen"><SiteHeader /><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-link"><ArrowLeft className="h-4 w-4" /> Back to Bettr Than</Link><div className="flex flex-wrap gap-2"><Link href="/admin/comparisons" className="text-link rounded-xl border border-white/10 px-4 py-2"><Scale className="h-4 w-4" /> Comparison builder</Link><Link href="/admin/offers" className="text-link rounded-xl border border-white/10 px-4 py-2"><Store className="h-4 w-4" /> Retailer offers</Link><Link href="/admin/analytics" className="text-link rounded-xl border border-white/10 px-4 py-2"><BarChart3 className="h-4 w-4" /> Analytics</Link></div></div><div className="my-5 flex flex-wrap gap-4"><Link href="/admin/research" className="text-link">Research batches &amp; Smartphones</Link><Link href="/category/smartphones" className="text-link">Smartphones catalog</Link></div><header className="mt-9 mb-10"><p className="section-kicker"><LockKeyhole className="mr-2 inline h-4 w-4" />Owner-only workspace</p><h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl">Product Agent Console</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">Discovery proposes a source. Extraction collects facts. Normalization standardizes them. Data QA flags uncertainty. You make the publishing decision.</p></header><IngestionDashboard initialJobs={jobs} /></div></main>;
}
