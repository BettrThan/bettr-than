import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";
import type { ExtendedCategorySlug } from "@/lib/extended-category-specs";
export async function getExtendedCategoryCollection(category: ExtendedCategorySlug) {
  const db = getDb();
  const [products, rows] = await Promise.all([
    db.select().from(catalogProducts).where(and(eq(catalogProducts.categorySlug, category), eq(catalogProducts.status, "published"))).orderBy(catalogProducts.canonicalName),
    db.select().from(comparisons).where(and(eq(comparisons.categorySlug, category), eq(comparisons.status, "published"))),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));
  return {
    products, comparisons: rows.filter((row) => { const left = byId.get(row.leftProductId), right = byId.get(row.rightProductId); return left && right && isCurrentPublicComparison(row, left, right); })
  };
}
export async function getExtendedCategoryComparison(category: ExtendedCategorySlug, slug: string) {
  const collection = await getExtendedCategoryCollection(category); const record = collection.comparisons.find((p) => p.slug === slug); if (!record)
    return null; return {
      record, left: collection.products.find((p) => p.id === record.leftProductId)!, right: collection.products.find((p) => p.id === record.rightProductId)!, collection
    };
}
