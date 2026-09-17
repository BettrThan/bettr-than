import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ingestionJobs } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { assertApprovedSource } from "@/lib/agents/product-ingestion";
import { categories } from "@/lib/categories";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const rows = await getDb().select().from(ingestionJobs).orderBy(desc(ingestionJobs.createdAt)).limit(50);
  return Response.json({ jobs: rows });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  const payload = await request.json() as { sourceUrl?: string; categorySlug?: string };
  try {
    const source = assertApprovedSource(payload.sourceUrl?.trim() ?? "");
    if (!categories.some((category) => category.slug === payload.categorySlug)) {
      return Response.json({ error: "Choose a valid category." }, { status: 400 });
    }
    const [existing] = await getDb().select().from(ingestionJobs).where(eq(ingestionJobs.sourceUrl, source.toString())).limit(1);
    if (existing) return Response.json({ job: existing, duplicate: true });
    const job = { id: crypto.randomUUID(), submittedBy: auth.user.userId, sourceUrl: source.toString(), sourceHost: source.hostname, categorySlug: payload.categorySlug!, status: "queued" };
    await getDb().insert(ingestionJobs).values(job);
    return Response.json({ job }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to queue source." }, { status: 400 });
  }
}
