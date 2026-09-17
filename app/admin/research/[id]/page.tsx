import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { SiteHeader } from "@/components/site-header";
import { SmartphoneComparisonExperience,SmartphoneSpecifications } from "@/components/smartphone-comparison-experience";
import { ExtendedCategoryComparisonExperience,ExtendedSpecifications } from "@/components/extended-category-comparison-experience";
import { isExtendedCategory } from "@/lib/extended-category-specs";
import { isAdminUser } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { researchBatches } from "@/db/schema";
import { validateResearchBatch,researchCatalogProduct,researchComparisons } from "@/lib/research-contract";
export const dynamic="force-dynamic";
export const metadata={title:"Research preview",robots:{index:false,follow:false}};
export default async function ResearchPreview({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{pair?:string}>}) {
  const {id}=await params;const {pair}=await searchParams;return <AuthenticatedPreview id={id} pair={pair}/>;
}
async function AuthenticatedPreview({id,pair}:{id:string;pair?:string}) {
  const user=await requireChatGPTUser(`/admin/research/${id}`);if(!(await isAdminUser(user)))notFound();
  const [row]=await getDb().select().from(researchBatches).where(eq(researchBatches.id,id)).limit(1);if(!row)notFound();
  const batch=validateResearchBatch(JSON.parse(row.payloadJson));const products=batch.products.map((p)=>researchCatalogProduct(p,batch.category,batch.researchedAt));const pairs=researchComparisons(products,batch.category,batch.researchedAt);const selected=pairs[Math.max(0,Number(pair)||0)]??pairs[0];
  return <main><SiteHeader/><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><Link href="/admin/research" className="text-link">Research and publication</Link><h1 className="mt-7 text-3xl font-black">{batch.title}</h1><p className="mt-3 text-amber-200">Research snapshot · {row.status} · no changes from this preview are published.</p>{selected && batch.category==="smartphones" && <SmartphoneComparisonExperience left={products.find((p)=>p.id===selected.leftProductId)!} right={products.find((p)=>p.id===selected.rightProductId)!} comparisonSlug={selected.slug} preview/>}{selected&&isExtendedCategory(batch.category)&&<ExtendedCategoryComparisonExperience category={batch.category} left={products.find((p)=>p.id===selected.leftProductId)!} right={products.find((p)=>p.id===selected.rightProductId)!} comparisonSlug={selected.slug} preview/>}<h2 className="mt-10 text-2xl font-black">{pairs.length} generated matchups</h2><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{pairs.map((p,index)=><Link key={p.id} href={`/admin/research/${id}?pair=${index}`} className="rounded-xl border border-white/10 p-3 text-sm text-cyan-200">{products.find((x)=>x.id===p.leftProductId)?.canonicalName} vs {products.find((x)=>x.id===p.rightProductId)?.canonicalName}</Link>)}</div><h2 className="mt-10 text-2xl font-black">Source records</h2>{products.map((p,index)=><details key={p.id} className="mt-4 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer font-bold">{p.canonicalName}</summary><p className="mt-3 text-slate-400">{batch.products[index].region} · {batch.products[index].configuration}</p><p className="mt-2 text-sm leading-6 text-slate-400">{batch.products[index].notes}</p>{batch.category==="smartphones"?<SmartphoneSpecifications product={p}/>:isExtendedCategory(batch.category)?<ExtendedSpecifications category={batch.category} product={p}/>:<dl className="mt-4 space-y-2">{Object.entries(batch.products[index].specs).map(([key,value])=><div key={key}><dt className="text-slate-400">{key.replaceAll("_"," ")}</dt><dd>{String(value)} · <a className="text-cyan-300 underline" href={batch.products[index].fieldSources[key].sourceUrl}>Source</a></dd></div>)}</dl>}</details>)}</div></main>;
}
