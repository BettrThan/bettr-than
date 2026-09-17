import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db";
import { catalogProducts, comparisons } from "@/db/schema";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";
import { HeadphoneComparisonPicker, type ProductOption, type ComparisonOption } from "@/components/headphone-comparison-picker";

type Category = "headphones" | "smartphones" | "portable-speakers" | "vr-headsets" | "wearables" | "game-consoles";
type Collection = { products: ProductOption[]; comparisons: ComparisonOption[] };

export async function ComparisonPageSelector({ category, leftId, rightId, collection }: { category: Category; leftId: string; rightId: string; collection?: Collection }) {
  let data = collection;
  let unavailable = false;
  if (!data) {
    try {
      const db = getDb();
      const [products, rows] = await Promise.all([
        db.select().from(catalogProducts).where(and(eq(catalogProducts.categorySlug, category), eq(catalogProducts.status, "published"))).orderBy(catalogProducts.canonicalName),
        db.select().from(comparisons).where(and(eq(comparisons.categorySlug, category), eq(comparisons.status, "published"))),
      ]);
      const byId = new Map(products.map(product => [product.id, product]));
      data = { products, comparisons: rows.filter(row => {
        const left = byId.get(row.leftProductId), right = byId.get(row.rightProductId);
        return left && right && isCurrentPublicComparison(row, left, right);
      }) };
    } catch {
      unavailable = true;
      data = { products: [], comparisons: [] };
    }
  }
  // Pass only the fields used by the public picker to the client.
  const products = data.products.map(({ id, slug, canonicalName, brand }) => ({ id, slug, canonicalName, brand }));
  const matches = data.comparisons.map(({ id, slug, leftProductId, rightProductId, coveragePercent, verdictStatus, href }) => ({ id, slug, leftProductId, rightProductId, coveragePercent, verdictStatus, href }));
  return <header className="mt-6" data-comparison-selector>
    <HeadphoneComparisonPicker key={`${category}:${leftId}:${rightId}`} products={products} comparisons={matches} category={category} initialLeftId={leftId} initialRightId={rightId} compact dataUnavailable={unavailable} />
    <Link href={`/how-we-score#${category}`} className="text-link mt-3 text-sm">How these scores work</Link>
  </header>;
}
