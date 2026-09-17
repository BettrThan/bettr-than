import { catalogProductImage } from "@/lib/product-image";
import { extendedCategoryModels, isExtendedCategory, verifiedExtendedSpecs, formatExtendedSpec } from "@/lib/extended-category-specs";
import { parseSmartphoneSpecs, smartphoneFields, formatSmartphoneSpec } from "@/lib/smartphone-specs";
import { formatHeadphoneSpec, headphoneFields, parseHeadphoneSpecs } from "@/lib/headphone-specs";

export const SITE_ORIGIN = "https://www.bettrthan.com";

type SeoProduct = { categorySlug?: string; status: string; slug: string; canonicalName: string; brand: string; description: string | null; imageUrl: string | null; sourceUrl: string; specsJson: string; specProvenanceJson?: string | null };

export function absoluteSiteUrl(path: string) { return new URL(path, SITE_ORIGIN).toString(); }

export function safePublicImage(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, SITE_ORIGIN);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

export function isIndexableCatalogProduct(product: SeoProduct) {
  if (product.categorySlug && isExtendedCategory(product.categorySlug)) {
    const specs = verifiedExtendedSpecs(product.categorySlug, product);
    return product.status === "published" && product.sourceUrl.startsWith("https://") && Object.keys(specs).length >= 3;
  }
  if (product.categorySlug && !["headphones", "smartphones"].includes(product.categorySlug)) return false;
  const phone = product.categorySlug === "smartphones";
  const specs = phone ? parseSmartphoneSpecs(product.specsJson) : parseHeadphoneSpecs(product.specsJson);
  const verifiedCount = (phone ? smartphoneFields : headphoneFields).filter((field) => (specs as Record<string,unknown>)[field.key] !== undefined).length;
  return product.status === "published" && product.sourceUrl.startsWith("https://") && verifiedCount >= 3;
}

export function productJsonLd(product: SeoProduct) {
  const phone = product.categorySlug === "smartphones";
  const specs = phone ? parseSmartphoneSpecs(product.specsJson) : parseHeadphoneSpecs(product.specsJson);
  const category = product.categorySlug && isExtendedCategory(product.categorySlug) ? product.categorySlug : null;
  const extendedSpecs = category ? verifiedExtendedSpecs(category, product) : {};
  const image = safePublicImage(catalogProductImage(product));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.canonicalName,
    brand: { "@type": "Brand", name: product.brand },
    description: product.description ?? undefined,
    image: image ?? undefined,
    category: category ? extendedCategoryModels[category].name : phone ? "Smartphones" : "Headphones",
    url: absoluteSiteUrl(`/catalog/${product.slug}`),
    additionalProperty: category ? extendedCategoryModels[category].fields.flatMap((field) => extendedSpecs[field.key] === undefined ? [] : [{ "@type": "PropertyValue", name: field.label, value: formatExtendedSpec(category, field.key, extendedSpecs[field.key]) }]) : phone ? smartphoneFields.flatMap((field) => (specs as Record<string,unknown>)[field.key] === undefined ? [] : [{ "@type": "PropertyValue", name: field.label, value: formatSmartphoneSpec(field.key, (specs as Record<string,unknown>)[field.key]) }]) : headphoneFields.flatMap((field) => (specs as Record<string,string>)[field.key] === undefined ? [] : [{ "@type": "PropertyValue", name: field.label, value: formatHeadphoneSpec(field.key, (specs as Record<string,string>)[field.key]!) }]),
  };
}

export function comparisonJsonLd(slug: string, left: SeoProduct, right: SeoProduct) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${left.canonicalName} vs ${right.canonicalName}`,
    url: absoluteSiteUrl(`/compare/${left.categorySlug ?? "headphones"}/${slug}`),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: 2,
      itemListElement: [left, right].map((product, index) => ({ "@type": "ListItem", position: index + 1, item: productJsonLd(product) })),
    },
  };
}

export function serializeJsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
