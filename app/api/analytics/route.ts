import { getDb } from "@/db";
import { analyticsEvents } from "@/db/schema";
import { normalizeDecisionEvent, shouldIgnoreAnalyticsRequest } from "@/lib/analytics-events";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).hostname === new URL(request.url).hostname; } catch { return false; }
}

export async function POST(request: Request) {
  if (shouldIgnoreAnalyticsRequest(request)) return Response.json({ ignored: true }, { status: 202 });
  if (!sameOrigin(request) || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return Response.json({ error: "Event rejected" }, { status: 403 });
  const event = normalizeDecisionEvent(await request.json().catch(() => null));
  if (!event) return Response.json({ error: "Invalid event" }, { status: 400 });
  await getDb().insert(analyticsEvents).values({ eventName: event.eventName, journeyId: event.journeyId ?? null, categorySlug: event.categorySlug ?? null, comparisonSlug: event.comparisonSlug ?? null, productIdsJson: JSON.stringify(event.productIds ?? []), presetKey: event.presetKey ?? null, metadataJson: JSON.stringify(event.metadata ?? {}) });
  return Response.json({ saved: true }, { status: 201 });
}
