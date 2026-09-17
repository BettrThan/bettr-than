import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { retailerOffers } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { saveManualOffer } from "@/lib/offer-store";
import type { OfferPayload } from "@/lib/offer-input";
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const payload = await request.json().catch(() => null) as OfferPayload | null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Response.json({error:"Offer data is required."},{status:400});
  try { return Response.json(await saveManualOffer(payload,auth.user.userId)); }
  catch(error) { console.error("Offer save failed",error); return Response.json({error:error instanceof Error && !/SQL|D1|constraint/i.test(error.message)?error.message:"Unable to save this offer. Your entries are unchanged; please try again."},{status:400}); }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const payload = await request.json().catch(() => null) as { offerId?: string; action?: string } | null;
  const offerId = clean(payload?.offerId, 100);
  const action = payload?.action;
  if (!offerId || !["disable", "approve"].includes(action ?? "")) return Response.json({ error: "Choose an offer and a valid action." }, { status: 400 });
  const db = getDb();
  const [offer] = await db.select().from(retailerOffers).where(eq(retailerOffers.id, offerId)).limit(1);
  if (!offer) return Response.json({ error: "Offer not found." }, { status: 404 });
  const status = action === "disable" ? "disabled" : "approved";
  await db.update(retailerOffers).set({ status, updatedAt: new Date().toISOString() }).where(eq(retailerOffers.id, offerId));
  return Response.json({ id: offerId, status });
}
