"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { offerCsvHeaders, type OfferCsvProduct } from "@/lib/offer-csv";
type Row={row:number;productName:string;payload:{retailerName:string;price:string;status:string};errors:string[]};
export function OfferImporter({products}:{products:OfferCsvProduct[]}){
  const router=useRouter(),[csv,setCsv]=useState(""),[rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const download=()=>{
    const escape=(value:string)=>`"${value.replaceAll('"','""')}"`;
    const text=[offerCsvHeaders.join(","),...products.map(p=>[p.slug,"","","","","","unknown","none","","draft"].map(escape).join(","))].join("\r\n");
    const url=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="bettr-than-retailer-offers.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const submit=async(commit:boolean,text=csv)=>{
    setBusy(true);setMessage("");
    try{const response=await fetch("/api/admin/offers/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csv:text,commit})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Import failed.");
      if(!commit)setRows(data.rows);else{const saved=data.results.filter((r:{status:string})=>r.status==="created"||r.status==="updated").length;const failed=data.results.filter((r:{status:string})=>r.status==="failed");setMessage(`${saved} offers saved. ${data.results.length-saved} rows skipped or failed.${failed.length?` Failed rows: ${failed.map((r:{row:number})=>r.row).join(", ")}. Review the list before retrying.`:""}`);setRows([]);setCsv("");router.refresh();}
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to import offers.");}finally{setBusy(false);}
  };
  return <section className="rounded-3xl border border-white/10 p-5 sm:p-7"><h2 className="text-2xl font-black">Set up offers in bulk</h2><p className="mt-3 text-sm leading-6 text-slate-400">Download a template with every approved product slug. Add current retailer or approved affiliate links, USD prices, shipping, and the time you checked them. Use an ISO timestamp with a timezone, such as 2026-09-15T16:00:00Z. Leave status as draft for review, or use approved to show an offer publicly. Up to 100 rows per upload.</p><div className="mt-4 flex flex-wrap items-center gap-4"><Button variant="outline" onClick={download}>Download offer template</Button><label className="text-sm font-bold">Upload offer CSV<input className="mt-2 block max-w-full text-sm" type="file" accept=".csv,text/csv" disabled={busy} onChange={async event=>{const file=event.target.files?.[0];setRows([]);setCsv("");if(!file)return;if(file.size>500000){setMessage("File must be smaller than 500 KB.");return;}const text=await file.text();setCsv(text);await submit(false,text);event.target.value="";}}/></label></div>
    {rows.length>0&&<><div className="mt-5 max-h-96 overflow-auto rounded-xl border border-white/10"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Row / product</th><th className="p-3">Offer</th><th className="p-3">Result</th></tr></thead><tbody>{rows.map(row=><tr key={row.row} className="border-t border-white/10"><td className="p-3">{row.row}. {row.productName}</td><td className="p-3">{row.payload.retailerName} · ${row.payload.price} · {row.payload.status}</td><td className="p-3">{row.errors.length?row.errors.join(" "):"Ready"}</td></tr>)}</tbody></table></div><Button className="mt-4" disabled={busy||rows.every(row=>row.errors.length>0)} onClick={()=>submit(true)}>Import {rows.filter(row=>!row.errors.length).length} valid offers</Button><p className="mt-2 text-sm text-slate-400">Matching product and retailer offers are updated. Invalid rows are skipped. Prices never change product scores.</p></>}
    {busy&&<p role="status" className="mt-3">Processing offers…</p>}{message&&<p role="status" className="mt-3 text-sm text-cyan-200">{message}</p>}
  </section>;
}
