import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons as comparisonTable } from "@/db/schema";
import { comparisonSlug, products as staticProducts } from "@/lib/products";
import { categories } from "@/lib/categories";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";
import { isIndexableCatalogProduct } from "@/lib/seo";
import { buyingGuides } from "@/lib/buying-guides";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.bettrthan.com";
  const staticComparisons: MetadataRoute.Sitemap = [];
  for (let index = 0; index < staticProducts.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < staticProducts.length; nextIndex += 1) {
      staticComparisons.push({ url: `${base}/compare/${comparisonSlug(staticProducts[index], staticProducts[nextIndex])}`, changeFrequency: "weekly", priority: 0.8 });
    }
  }
  let dynamicProducts: Array<{ slug: string; updatedAt: string }> = [];
  let dynamicComparisons: Array<{ slug: string; categorySlug:string; updatedAt: string }> = [];
  try {
    const [productRows, comparisonRows] = await Promise.all([
      getDb().select().from(catalogProducts).where(eq(catalogProducts.status, "published")),
      getDb().select().from(comparisonTable).where(eq(comparisonTable.status, "published")),
    ]);
    dynamicProducts = productRows.filter(isIndexableCatalogProduct).map(({ slug, updatedAt }) => ({ slug, updatedAt }));
    const productsById = new Map(productRows.map((product) => [product.id, product]));
    dynamicComparisons = comparisonRows.flatMap((comparison) => {
      const left = productsById.get(comparison.leftProductId);
      const right = productsById.get(comparison.rightProductId);
      return left && right && isCurrentPublicComparison(comparison, left, right) ? [{ slug: comparison.slug, categorySlug:comparison.categorySlug, updatedAt: comparison.updatedAt }] : [];
    });
  } catch {
    // Static routes remain discoverable while the catalog database is unavailable.
  }
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: "https://bettrthan.com/how-we-score", changeFrequency: "monthly", priority: 0.7 },
    ...Object.keys(buyingGuides).map(category => ({ url: `https://bettrthan.com/rankings?category=${category}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: "https://bettrthan.com/guides", changeFrequency: "monthly", priority: 0.8 },
    ...Object.keys(buyingGuides).map(category=>({url:`https://bettrthan.com/guides/${category}`,lastModified:new Date("2026-09-16T00:00:00Z"),changeFrequency:"monthly" as const,priority:0.75})),
    { url: `${base}/categories`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.85 },
    ...categories.filter((category) => category.live).map((category) => ({ url: `${base}/category/${category.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...staticProducts.map((product) => ({ url: `${base}/product/${product.slug}`, changeFrequency: "weekly" as const, priority: 0.75 })),
    ...staticComparisons,
    ...dynamicProducts.map((product) => ({ url: `${base}/catalog/${product.slug}`, lastModified: new Date(product.updatedAt), changeFrequency: "weekly" as const, priority: 0.75 })),
    ...dynamicComparisons.map((comparison) => ({ url: `${base}/compare/${comparison.categorySlug}/${comparison.slug}`, lastModified: new Date(comparison.updatedAt), changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
