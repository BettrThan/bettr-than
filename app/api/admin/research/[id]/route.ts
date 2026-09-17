import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchBatches } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireAdminApi(request);if("error" in auth)return auth.error;
  const [record]=await getDb().select().from(researchBatches).where(eq(researchBatches.id,(await params).id)).limit(1);
  if(!record)return Response.json({error:"Batch not found."},{status:404});
  return new Response(record.payloadJson,{headers:{"content-type":"application/json","content-disposition":`attachment; filename="${record.id}.json"`,"cache-control":"private, no-store"}});
}
