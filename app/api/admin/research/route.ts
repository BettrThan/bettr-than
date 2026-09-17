import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { researchBatches } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { listResearchBatches, publishResearchBatch, uploadResearchBatch } from "@/lib/research-store";

export async function GET(request: Request) {
  const auth=await requireAdminApi(request); if("error" in auth)return auth.error;
  try { return Response.json({batches:await listResearchBatches()}); } catch { return Response.json({error:"Research history is temporarily unavailable."},{status:503}); }
}
export async function POST(request: Request) {
  const auth=await requireAdminApi(request); if("error" in auth)return auth.error;
  try {
    const text=await request.text(); if(text.length>500_000)return Response.json({error:"Research upload exceeds 500 KB."},{status:413});
    const payload=JSON.parse(text);
    if(payload.action === "upload") return Response.json(await uploadResearchBatch(payload.batch,auth.user.userId));
    if(payload.action === "publish" && typeof payload.id === "string" && typeof payload.digest === "string") return Response.json(await publishResearchBatch(payload.id,payload.digest,auth.user.userId));
    if(payload.action === "reject" && typeof payload.id === "string") {
      await getDb().update(researchBatches).set({status:"rejected"}).where(and(eq(researchBatches.id,payload.id),eq(researchBatches.status,"pending")));
      return Response.json({rejected:true});
    }
    return Response.json({error:"Choose a valid research action."},{status:400});
  } catch(error) { console.error("Research action failed",error); return Response.json({error:error instanceof Error ? error.message.slice(0,700) : "Research could not be saved. Your live products have not changed."},{status:422}); }
}
