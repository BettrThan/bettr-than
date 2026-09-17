import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { SiteHeader } from "@/components/site-header";
import { CatalogProductImage } from "@/components/catalog-product-image";
import { DecisionPageEvent } from "@/components/decision-page-event";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { finderCategories, finderPresets, finderRequirements, isFinderCategory, rankFinderProducts } from "@/lib/product-finder";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Find your match",robots:{index:false,follow:true}};
type Query=Record<string,string|string[]|undefined>;
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;
const inputClass="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#07101f] px-3 text-base text-white";

export default async function FindPage({searchParams}:{searchParams:Promise<Query>}) {
  const query=await searchParams,requested=one(query.category)??"headphones",category=isFinderCategory(requested)?requested:"headphones";
  const presets=finderPresets(category),requestedPreset=one(query.preset)??"balanced",preset=Object.hasOwn(presets,requestedPreset)?requestedPreset:"balanced";
  const budgetText=one(query.budget)??"",budget=budgetText===""?null:Number(budgetText);
  const requirements=typeof query.require==="string"?[query.require]:query.require??[];
  const invalidBudget=budget!==null&&(!Number.isFinite(budget)||budget<=0||budget>100000);
  const invalidRequirements=requirements.some(key=>!finderRequirements[category].some(r=>r.key===key));
  let data:ReturnType<typeof rankFinderProducts>={results:[],eligiblePairs:[],preset,poolSize:0};let unavailable=false;
  try{
    const db=getDb();const [products,pairs]=await Promise.all([
      db.select().from(catalogProducts).where(and(eq(catalogProducts.categorySlug,category),eq(catalogProducts.status,"published"))),
      db.select().from(comparisons).where(and(eq(comparisons.categorySlug,category),eq(comparisons.status,"published"))),
    ]);
    if(!invalidBudget&&!invalidRequirements)data=rankFinderProducts(category,products,pairs,{preset,budget,requirements});
  }catch(error){console.error("Product finder unavailable",error);unavailable=true;}
  const shortlist=data.results.slice(0,3),shortlistIds=new Set(shortlist.map(item=>item.product.id));
  const matchups=data.eligiblePairs.filter(pair=>shortlistIds.has(pair.leftProductId)&&shortlistIds.has(pair.rightProductId));
  return <main className="min-h-screen"><SiteHeader/><DecisionPageEvent event="finder_viewed" category={category} preset={preset}/><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <header><p className="section-kicker">Find your match</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Start with what you need.</h1><p className="mt-3 max-w-3xl text-slate-400">Choose a category, set a budget, and tell us what you can’t do without. We’ll narrow the approved catalog using sourced facts and the category’s scoring model.</p></header>
    <nav className="my-6 flex flex-wrap gap-2" aria-label="Finder category">{Object.entries(finderCategories).map(([key,label])=><Link key={key} href={`/find?category=${key}`} aria-current={category===key?"page":undefined} className={`rounded-xl border px-4 py-3 text-sm font-bold ${category===key?"border-cyan-300 bg-cyan-300 text-slate-950":"border-white/15 text-slate-300"}`}>{label}</Link>)}</nav>
    <form key={`${category}:${preset}:${budgetText}:${requirements.join(",")}`} action="/find" method="get" className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
      <input type="hidden" name="category" value={category}/><div className="grid gap-5 sm:grid-cols-2">
        <label className="font-semibold">What matters most?<select name="preset" defaultValue={preset} className={inputClass}>{Object.entries(presets).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
        <label className="font-semibold">Maximum reference price (USD)<input name="budget" type="number" min="1" max="100000" step="0.01" defaultValue={budgetText} placeholder="Any budget" className={inputClass}/></label>
      </div><fieldset className="mt-6"><legend className="font-bold">Must-have features</legend><div className="mt-3 flex flex-wrap gap-3">{finderRequirements[category].map(requirement=><label key={requirement.key} className="flex min-h-11 items-center gap-3 rounded-xl border border-white/15 px-4 py-3"><input type="checkbox" name="require" value={requirement.key} defaultChecked={requirements.includes(requirement.key)} className="h-5 w-5 accent-cyan-300"/>{requirement.label}</label>)}</div><p className="mt-3 text-sm text-slate-400">Every selected feature must be verified. Unknown values are excluded; your budget uses sourced reference prices, not live checkout prices.</p></fieldset>
      <div className="mt-6 flex flex-wrap items-center gap-4"><button className="primary-action" type="submit">Find my matches</button><Link className="text-link" href={`/find?category=${category}`}>Reset filters</Link></div>
    </form>
    <section className="mt-10" aria-labelledby="finder-results"><h2 id="finder-results" className="text-2xl font-black">Your {finderCategories[category].toLowerCase()} shortlist</h2>
      {unavailable?<p role="alert" className="mt-4 rounded-2xl border border-amber-300/30 p-5">The catalog is temporarily unavailable. Please reload to try again.</p>:invalidBudget||invalidRequirements?<p role="alert" className="mt-4 text-amber-200">Choose a valid budget and features for this category, or reset the filters.</p>:!shortlist.length?<div className="mt-4 rounded-2xl border border-white/15 p-6"><h3 className="font-bold">No verified matches for these preferences.</h3><p className="mt-2 text-slate-400">Try a higher budget or remove a must-have feature. Products without an eligible published comparison for this preset are not ranked.</p></div>:<>
      <p className="mt-3 text-slate-400">{data.results.length} matching products · {presets[preset].label} priorities. Share this page’s URL to keep your selections.</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">{shortlist.map((item,index)=><article key={item.product.id} className="flex flex-col rounded-3xl border border-white/10 bg-white/[.035] p-5"><p className="text-sm font-bold text-cyan-200">{index===0?"Top specification match":`Alternative ${index}`}</p><div className="mt-4 flex h-40 items-center justify-center rounded-2xl bg-white p-4"><CatalogProductImage product={item.product}/></div><h3 className="mt-4 text-xl font-black">{item.product.canonicalName}</h3><p className="mt-2 text-slate-400">{item.referencePrice===null?"Reference price unverified":`$${item.referencePrice.toFixed(2)} reference price`}</p><p className="mt-3 font-bold">{item.average}/100 average comparison score</p><p className="mt-1 text-sm text-slate-400">Against {item.opponents} eligible products in the published catalog.</p>{item.advantages.length>0?<><h4 className="mt-4 font-bold">Where it tends to lead</h4><ul className="mt-2 list-inside list-disc text-sm leading-6 text-slate-300">{item.advantages.map(label=><li key={label}>{label}</li>)}</ul></>:<p className="mt-4 text-sm text-slate-400">No distinct advantage across the scored facts. Compare its trade-offs below.</p>}<Link href={`/catalog/${item.product.slug}`} className="text-link mt-auto pt-5">Product details and offers</Link></article>)}</div>
      {matchups.length>0&&<div className="mt-6"><h3 className="font-bold">Compare your matches</h3><div className="mt-3 flex flex-col items-start gap-3">{matchups.map(pair=><Link key={pair.id} className="text-link" href={`/compare/${category}/${pair.slug}?preset=${preset}`}>{shortlist.find(item=>item.product.id===pair.leftProductId)!.product.canonicalName} vs {shortlist.find(item=>item.product.id===pair.rightProductId)!.product.canonicalName}</Link>)}</div></div>}
      </>}
      <details className="mt-7 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer font-bold text-cyan-200">How this shortlist is ranked</summary><p className="mt-3 text-sm leading-6 text-slate-400">We average each product’s scores against its eligible, published opponents using your selected preset, then apply your budget and feature filters. The opponent count is shown because products can have different evidence coverage. These relative specification scores are not lab ratings or a claim to be the best products on the market. Missing facts never become assumed features. Retailer payments and affiliate commissions do not enter the ranking. Final price, regional compatibility, fit, and subjective quality still need checking.</p></details>
    </section>
  </div></main>;
}
