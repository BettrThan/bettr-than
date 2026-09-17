import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { previewOfferCsv } from "@/lib/offer-csv";
import { saveManualOffer } from "@/lib/offer-store";

export async function POST(request:Request){
  const auth=await requireAdminApi(request);if("error"in auth)return auth.error;
  const raw=await request.text();if(raw.length>550000)return Response.json({error:"Offer upload is too large."},{status:413});
  let body:{csv?:unknown;commit?:unknown};try{body=JSON.parse(raw);}catch{return Response.json({error:"Invalid upload."},{status:400});}
  if(!body||typeof body.csv!=="string")return Response.json({error:"Upload a CSV file."},{status:400});
  const db=getDb();
  try{
    const products=await db.select({id:catalogProducts.id,slug:catalogProducts.slug,canonicalName:catalogProducts.canonicalName}).from(catalogProducts).where(eq(catalogProducts.status,"published"));
    const rows=previewOfferCsv(body.csv,products);
    if(body.commit!==true)return Response.json({rows});
    // Validate again on the server immediately before writing. Invalid rows never publish.
    const results=[];
    for(const row of rows){
      if(row.errors.length){results.push({row:row.row,status:"skipped",error:row.errors.join(" ")});continue;}
      try{const saved=await saveManualOffer(row.payload,auth.user.userId,db);results.push({row:row.row,status:saved.created?"created":"updated"});}
      catch(error){console.error("Bulk offer row failed",row.row,error);results.push({row:row.row,status:"failed",error:"Could not save this row. Review the current offer before retrying."});}
    }
    return Response.json({results});
  }catch(error){console.error("Offer import failed",error);return Response.json({error:error instanceof Error&&!/SQL|D1|constraint/i.test(error.message)?error.message:"Could not load offers. Please try again."},{status:400});}
}
