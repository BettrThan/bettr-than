import imageRepairs from "@/data/research/product-image-repairs.json";
import { isPublicSiteHostname } from "@/lib/site-hostname";
/** Serve bundled product images from the current origin in preview and production. */
export function productImageSrc(value: string): string {
  try {
    const url = new URL(value);
    if (isPublicSiteHostname(url.hostname) && url.pathname.startsWith("/products/"))
      return url.pathname;
  }
  catch { }
  return value;
}
/** Image-only repairs do not alter approved specifications or data versions. */
export function catalogProductImage(product: {
  slug: string;
  imageUrl: string | null;
}): string | null {
  const repair = (imageRepairs as Record<string, {
    src: string;
  }>)[product.slug];
  return product.imageUrl ? productImageSrc(product.imageUrl) : repair?.src ?? null;
}
