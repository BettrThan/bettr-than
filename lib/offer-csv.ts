import { parseCsvGrid } from "@/lib/csv-product-import";
import { validateOfferInput, type OfferPayload } from "@/lib/offer-input";
export const offerCsvHeaders=["product_slug","retailer_name","retailer_url","destination_url","price_usd","shipping_usd","availability","relationship","checked_at","status"];
export type OfferCsvProduct={id:string;slug:string;canonicalName:string};
export function previewOfferCsv(text:string,products:OfferCsvProduct[]){
  if(text.length>500000)throw new Error("Offer CSV must be smaller than 500 KB.");
  const grid=parseCsvGrid(text),headers=(grid.shift()??[]).map(v=>v.replace(/^\uFEFF/,"").trim().toLowerCase());
  if(new Set(headers).size!==headers.length||offerCsvHeaders.some(header=>!headers.includes(header)))throw new Error("Use the offer template's columns without duplicate headers.");
  const rows=grid.filter(row=>row.some(cell=>cell.trim()));
  if(!rows.length||rows.length>100)throw new Error("Upload between 1 and 100 offers at a time.");
  const seen=new Set<string>();
  return rows.map((row,index)=>{
    const values=Object.fromEntries(headers.map((header,i)=>[header,row[i]?.trim()??""]));
    const product=products.find(p=>p.slug===values.product_slug),errors:string[]=[];
    const payload:OfferPayload={productId:product?.id,retailerName:values.retailer_name,retailerUrl:values.retailer_url,destinationUrl:values.destination_url,price:values.price_usd,shipping:values.shipping_usd,currency:"USD",availability:values.availability,affiliateStatus:values.relationship,checkedAt:values.checked_at,status:values.status};
    if(row.length!==headers.length)errors.push("Column count does not match the template.");
    if(!product)errors.push("Product slug is not in the approved catalog.");
    const identity=`${values.product_slug}:${values.retailer_name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`;
    if(seen.has(identity))errors.push("Duplicate product and retailer in this file.");seen.add(identity);
    try{validateOfferInput(payload);}catch(error){errors.push(error instanceof Error?error.message:"Invalid offer.");}
    return {row:index+2,productName:product?.canonicalName??values.product_slug,payload,errors};
  });
}
