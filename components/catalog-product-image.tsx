"use client";
import {useState} from "react";
import {catalogProductImage} from "@/lib/product-image";

export function CatalogProductImage({product,className="h-full w-full object-contain"}:{product:{slug:string;canonicalName:string;imageUrl:string|null};className?:string}) {
  const src=catalogProductImage(product);
  const [failedSrc,setFailedSrc]=useState<string|null>(null);
  if (!src || failedSrc === src) return <div role="img" aria-label={`${product.canonicalName}: photo unavailable`} className="flex h-full min-h-28 items-center justify-center p-4 text-center text-sm text-slate-600">Product photo unavailable</div>;
  // Bundled or manufacturer images are served directly; no optimizer dependency.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={product.canonicalName} className={className} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailedSrc(src)}/>;
}
