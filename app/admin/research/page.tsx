import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { SiteHeader } from "@/components/site-header";
import { ResearchConsole } from "@/components/research-console";
import { isAdminUser } from "@/lib/admin-auth";
import { getBundledResearch } from "@/lib/bundled-research";
import { listResearchBatches } from "@/lib/research-store";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Research and publication",robots:{index:false,follow:false}};
export default async function ResearchPage() {
  const user=await requireChatGPTUser("/admin/research");if(!(await isAdminUser(user)))notFound();
  let rows:Awaited<ReturnType<typeof listResearchBatches>>=[];let unavailable=false;
  try{rows=await listResearchBatches();}catch(error){console.error("Research unavailable",error);unavailable=true;}
  return <main className="min-h-screen"><SiteHeader/><div className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><Link href="/admin/comparisons" className="text-link">Comparison builder</Link><h1 className="mt-7 text-4xl font-black">Research and publication</h1><p className="mt-4 mb-8 text-slate-400">Automatically prepared research. One publication decision per batch.</p>{unavailable?<p role="alert" className="rounded-xl border border-amber-300/30 p-5">Research storage is temporarily unavailable. Please refresh in a moment.</p>:<ResearchConsole bundled={getBundledResearch()} initial={rows}/>}</div></main>;
}
