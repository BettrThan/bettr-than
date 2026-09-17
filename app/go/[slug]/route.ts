import { env } from "cloudflare:workers";
import { getProduct } from "@/lib/products";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const product = getProduct((await params).slug);
  if (!product) return new Response("Product not found", { status: 404 });
  const query = encodeURIComponent(product.name);
  const tag = (env as unknown as Record<string, string | undefined>).AMAZON_ASSOCIATE_TAG;
  const destination = new URL(`https://www.amazon.com/s?k=${query}`);
  if (tag) destination.searchParams.set("tag", tag);
  return Response.redirect(destination, 302);
}
