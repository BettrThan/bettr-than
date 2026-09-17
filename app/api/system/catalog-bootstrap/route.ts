import { env } from "cloudflare:workers";
import { launchTopTenCatalog } from "@/lib/launch-catalog";

export async function POST(request: Request) {
  const configured = (env as unknown as { CATALOG_BOOTSTRAP_TOKEN?: string }).CATALOG_BOOTSTRAP_TOKEN?.trim();
  const supplied = request.headers.get("x-bettrthan-bootstrap")?.trim();
  if (!configured || !supplied || supplied !== configured) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const result = await launchTopTenCatalog("system:verified-launch-catalog");
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Catalog rollout failed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
