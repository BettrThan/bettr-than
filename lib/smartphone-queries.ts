import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";

export async function getSmartphoneCollection() {
  const db=getDb();
  const [products,rows]=await Promise.all([
    db.select().from(catalogProducts).where(and(eq(catalogProducts.categorySlug,"smartphones"),eq(catalogProducts.status,"published"))).orderBy(catalogProducts.canonicalName),
    db.select().from(comparisons).where(and(eq(comparisons.categorySlug,"smartphones"),eq(comparisons.status,"published"))),
  ]);
  const byId=new Map(products.map((p)=>[p.id,p]));
  return {products,comparisons:rows.filter((row)=>{const l=byId.get(row.leftProductId),r=byId.get(row.rightProductId);return l && r && isCurrentPublicComparison(row,l,r);})};
}
export async function getSmartphoneComparison(slug:string) {
  const collection=await getSmartphoneCollection();
  const record=collection.comparisons.find((p)=>p.slug===slug);
  if(!record)return null;
  return {record,left:collection.products.find((p)=>p.id===record.leftProductId)!,right:collection.products.find((p)=>p.id===record.rightProductId)!,collection};
}
