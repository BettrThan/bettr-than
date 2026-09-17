import Link from "next/link";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { formatMoney, isStaleOffer, lowestComparableOfferIds, rankPublicOffers, type PublicOffer } from "@/lib/offers";
const availabilityLabels={in_stock:"In stock",out_of_stock:"Out of stock",preorder:"Preorder",unknown:"Availability unverified"};

export function RetailerOffers({productName,offers,comparisonSlug}:{productName:string;offers:PublicOffer[];comparisonSlug?:string}){
  const ranked=rankPublicOffers(offers),lowest=lowestComparableOfferIds(ranked);
  return <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6" aria-label={`Where to buy ${productName}`}>
    <div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-cyan-300"/><h3 className="font-display text-xl font-black text-white">Where to buy {productName}</h3></div>
    <p className="mt-3 text-sm leading-6 text-slate-300">We may earn a commission when you buy through links marked “Affiliate link.” This does not change your price or our scores. <Link href="/how-we-earn" className="text-cyan-200 underline">How we earn</Link></p>
    {!ranked.length?<p className="mt-4 text-sm leading-6 text-slate-400">No verified retailer offers are available yet.</p>:<div className="mt-4 grid gap-3">{ranked.map(offer=>{
      const stale=isStaleOffer(offer),canBuy=offer.availability==="in_stock"||offer.availability==="preorder";
      const destination=`/go/offer/${offer.id}${comparisonSlug?`?comparison=${encodeURIComponent(comparisonSlug)}`:""}`;
      return <article key={offer.id} className="rounded-2xl border border-white/10 bg-[#07101f]/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-white">{offer.retailerName}</p><div className="mt-2 flex flex-wrap gap-2">{lowest.has(offer.id)&&<span className="text-sm font-bold text-emerald-200">Lowest listed total</span>}{offer.isSponsored&&<span className="text-sm font-bold text-amber-200">Sponsored</span>}{offer.isAffiliate&&<span className="text-sm text-cyan-200">Affiliate link</span>}</div><p className="mt-2 text-sm text-slate-400">{availabilityLabels[offer.availability]} · checked {new Date(offer.lastCheckedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>{stale&&<p className="mt-2 text-sm font-semibold text-amber-200">Price needs rechecking. Confirm at the retailer.</p>}</div>
        <div className="text-right"><p className="text-2xl font-black">{formatMoney(offer.shippingMinor===null?offer.priceMinor:offer.totalPriceMinor,offer.currency)}</p><p className="mt-1 text-sm text-slate-400">{offer.shippingMinor===null?"Item price · shipping unknown":"Item + shipping · before tax"}</p>{offer.shippingMinor!==null&&<p className="mt-1 text-xs text-slate-500">{formatMoney(offer.priceMinor,offer.currency)} + {formatMoney(offer.shippingMinor,offer.currency)} shipping</p>}</div></div>
        {canBuy&&<a href={destination} rel={offer.isAffiliate||offer.isSponsored?"nofollow sponsored":"nofollow"} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-[#07101f] hover:bg-cyan-200">{stale?"Check current price":offer.availability==="preorder"?"View preorder":"View offer"}<ExternalLink className="h-4 w-4"/></a>}
      </article>;
    })}</div>}
    <p className="mt-4 text-sm leading-6 text-slate-400">Prices and availability can change. Totals exclude tax. Lowest-listed labels compare only fresh, in-stock offers with known shipping in the same currency. Sponsored status never changes their order.</p>
  </section>;
}
