import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts,comparisons } from "@/db/schema";
import { getLaunchCatalogReadiness,getLaunchComparisonRank } from "@/lib/launch-plan";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";
async function loadLaunchReadiness() {
  try {
    const [products,rows]=await Promise.all([getDb().select().from(catalogProducts).where(and(eq(catalogProducts.categorySlug,"headphones"),eq(catalogProducts.status,"published"))),getDb().select().from(comparisons).where(eq(comparisons.categorySlug,"headphones"))]);
    const readiness=getLaunchCatalogReadiness(products);const byId=new Map(products.map((p)=>[p.id,p]));
    const current=rows.filter((c)=>{const l=byId.get(c.leftProductId),r=byId.get(c.rightProductId);return l&&r&&isCurrentPublicComparison(c,l,r);});
    const launch=current.filter((c)=>getLaunchComparisonRank(byId.get(c.leftProductId)!.canonicalName,byId.get(c.rightProductId)!.canonicalName)!==null);
    return {readiness,current,launch};
  }catch(error){console.error("Launch readiness unavailable",error);return null;}
}
export async function LaunchReadiness() {
 const result=await loadLaunchReadiness();
 if(!result)return <p className="mb-6 rounded-xl border border-amber-300/20 p-4 text-amber-200">Launch readiness is temporarily unavailable. Your catalog remains unchanged.</p>;
 const {readiness,current,launch}=result;
    return <section className="mb-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.04] p-5"><h2 className="text-xl font-black">Headphones launch readiness</h2><p className="mt-3 text-slate-300">{readiness.readyCount} / 10 complete launch products · {launch.length} / 20 priority matchups live · {current.length} current comparisons in the full library</p><p className="mt-2 text-sm text-slate-400">Priority matchups appear first on the home and category pages. The rest of the published library stays accessible. Readiness checks sources, images, completeness, conflicts, coverage, and current approved verdicts.</p></section>;
}
