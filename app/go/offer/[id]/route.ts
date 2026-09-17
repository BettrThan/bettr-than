import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { analyticsEvents, catalogProducts, comparisons, offerClicks, retailerOffers, retailers } from "@/db/schema";
import { safeCommerceUrl } from "@/lib/offers";
import { shouldIgnoreAnalyticsRequest } from "@/lib/analytics-events";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const db = getDb();
  const [offer] = await db.select().from(retailerOffers).where(and(eq(retailerOffers.id, id), eq(retailerOffers.status, "approved"))).limit(1);
  if (!offer) return new Response("Offer not found", { status: 404 });
  const [product] = await db.select({id:catalogProducts.id,categorySlug:catalogProducts.categorySlug}).from(catalogProducts).where(and(eq(catalogProducts.id,offer.productId),eq(catalogProducts.status,"published"))).limit(1);
  if (!product) return new Response("Product unavailable", {status:404});
  const [retailer] = await db.select({ enabled: retailers.enabled, name: retailers.name }).from(retailers).where(eq(retailers.id, offer.retailerId)).limit(1);
  const destination = retailer?.enabled ? safeCommerceUrl(offer.destinationUrl) : null;
  if (!destination) return new Response("Offer unavailable", { status: 404 });
  const requestedComparison = new URL(request.url).searchParams.get("comparison");
  let comparisonSlug:string|null=null;
  if(requestedComparison&&/^[a-z0-9][a-z0-9-]{0,239}$/.test(requestedComparison)){
    const [pair]=await db.select().from(comparisons).where(and(eq(comparisons.slug,requestedComparison),eq(comparisons.status,"published"))).limit(1);
    if(pair&&(pair.leftProductId===product.id||pair.rightProductId===product.id))comparisonSlug=pair.slug;
  }
  if (!shouldIgnoreAnalyticsRequest(request)) await Promise.allSettled([
    db.insert(offerClicks).values({ offerId: offer.id, productId: offer.productId }),
    db.insert(analyticsEvents).values({ eventName: "retailer_clicked", categorySlug:product.categorySlug, productIdsJson: JSON.stringify([offer.productId]), comparisonSlug, metadataJson: JSON.stringify({ retailerName: retailer.name }) }),
  ]);
  return new Response(null,{status:302,headers:{Location:destination,"Cache-Control":"no-store"}});
}
