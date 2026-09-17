import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";
import { sortHeadphoneComparisons } from "@/lib/launch-plan";

export async function getRelatedHeadphoneComparisons(productIds: string[], excludeId?: string, limit = 6) {
  if (productIds.length === 0) return [];
  const [products, comparisonRows] = await Promise.all([
    getDb().select().from(catalogProducts).where(and(eq(catalogProducts.categorySlug, "headphones"), eq(catalogProducts.status, "published"))),
    getDb().select().from(comparisons).where(and(eq(comparisons.categorySlug, "headphones"), eq(comparisons.status, "published"), or(...productIds.flatMap((id) => [eq(comparisons.leftProductId, id), eq(comparisons.rightProductId, id)])))),
  ]);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const current = comparisonRows.filter((comparison) => comparison.id !== excludeId).filter((comparison) => {
    const left = productsById.get(comparison.leftProductId); const right = productsById.get(comparison.rightProductId);
    return left && right && isCurrentPublicComparison(comparison, left, right);
  });
  return sortHeadphoneComparisons(current, productsById).slice(0, limit).flatMap((comparison) => {
    const left = productsById.get(comparison.leftProductId); const right = productsById.get(comparison.rightProductId);
    return left && right ? [{ id: comparison.id, slug: comparison.slug, leftName: left.canonicalName, rightName: right.canonicalName }] : [];
  });
}
