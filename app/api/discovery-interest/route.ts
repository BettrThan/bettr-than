import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { discoveryDemand } from "@/db/schema";

const useCases = new Set(["travel", "office", "value"]);

export async function POST(request: Request) {
  const payload = await request.json() as { useCase?: string };
  const useCase = payload.useCase?.trim().toLowerCase();
  if (!useCase || !useCases.has(useCase)) return Response.json({ error: "Choose Travel, Office, or Value." }, { status: 400 });
  await getDb().insert(discoveryDemand).values({ useCase, requestCount: 1 }).onConflictDoUpdate({ target: discoveryDemand.useCase, set: { requestCount: sql`${discoveryDemand.requestCount} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` } });
  return Response.json({ saved: true });
}
