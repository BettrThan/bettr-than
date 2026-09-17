"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useComparisonPreset<T extends string>(allowed:readonly T[],preview=false) {
  const router=useRouter(),pathname=usePathname(),query=useSearchParams();
  const [previewPreset,setPreviewPreset]=useState<T>("balanced" as T);
  const requested=query.get("preset") as T|null;
  const preset=preview?previewPreset:requested&&allowed.includes(requested)?requested:"balanced" as T;
  const choose=(next:T)=>{
    if(!allowed.includes(next))return;
    if(preview){setPreviewPreset(next);return;}
    const params=new URLSearchParams(query.toString());
    if(next==="balanced")params.delete("preset");else params.set("preset",next);
    router.replace(`${pathname}${params.size?`?${params}`:""}`,{scroll:false});
  };
  return [preset,choose] as const;
}
