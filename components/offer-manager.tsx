"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Edit3, Loader2, Plus, Power, RefreshCw, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProductOption = { id: string; canonicalName: string; brand: string; categorySlug: string };
type RetailerOption = { id: string; name: string; homepageUrl: string; affiliateStatus: string };
type OfferRow = {
  id: string; productId: string; retailerId: string; retailerName: string; retailerUrl: string; affiliateStatus: string;
  destinationUrl: string; priceMinor: number; shippingMinor: number | null; currency: string; availability: string; status: string; lastCheckedAt: string;
};

const nowForInput = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
const dateForInput = (value: string) => { const date = new Date(value); return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : nowForInput(); };
const dollars = (minor: number | null) => minor == null ? "" : (minor / 100).toFixed(2);
const emptyForm = (productId = "") => ({ offerId: "", productId, retailerName: "", retailerUrl: "", affiliateStatus: "none", destinationUrl: "", price: "", shipping: "", currency: "USD", availability: "unknown", checkedAt: nowForInput(), status: "draft" });

export function OfferManager({ products, retailers, offers }: { products: ProductOption[]; retailers: RetailerOption[]; offers: OfferRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(() => emptyForm(products[0]?.id));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#07101f] px-3 text-base text-white outline-none focus:border-cyan-300/60";
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const chooseRetailer = (name: string) => { const retailer = retailers.find((item) => item.name === name); setForm((current) => retailer ? { ...current, retailerName: retailer.name, retailerUrl: retailer.homepageUrl, affiliateStatus: retailer.affiliateStatus } : { ...current, retailerName: name }); };

  const edit = (offer: OfferRow) => {
    setForm({ offerId: offer.id, productId: offer.productId, retailerName: offer.retailerName, retailerUrl: offer.retailerUrl, affiliateStatus: offer.affiliateStatus, destinationUrl: offer.destinationUrl, price: dollars(offer.priceMinor), shipping: dollars(offer.shippingMinor), currency: offer.currency, availability: offer.availability, checkedAt: dateForInput(offer.lastCheckedAt), status: offer.status === "draft" ? "draft" : "approved" });
    setError(null); setSuccess(null); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    setBusy("save"); setError(null); setSuccess(null);
    try {
      const response = await fetch("/api/admin/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, checkedAt: new Date(form.checkedAt).toISOString() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save the offer.");
      setSuccess(body.created ? "Offer created and price observation recorded." : "Offer updated and price observation recorded.");
      setForm(emptyForm(products[0]?.id)); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save the offer."); }
    finally { setBusy(null); }
  };

  const changeStatus = async (offer: OfferRow, action: "disable" | "approve") => {
    setBusy(offer.id); setError(null); setSuccess(null);
    try {
      const response = await fetch("/api/admin/offers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId: offer.id, action }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to update the offer.");
      setSuccess(action === "disable" ? "Offer disabled." : "Offer approved."); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update the offer."); }
    finally { setBusy(null); }
  };

  return <div className="space-y-8">
    <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.04] p-5 sm:p-7" aria-labelledby="manual-offer-heading">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="section-kicker"><Store className="mr-2 inline h-4 w-4" />Manual offer</p><h2 id="manual-offer-heading" className="mt-1 font-display text-2xl font-black text-white">{form.offerId ? "Edit retailer offer" : "Add a retailer offer"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Use a current retailer page and record exactly when you checked the price. Saving a change preserves a price-history observation.</p></div>{form.offerId && <Button variant="ghost" onClick={() => setForm(emptyForm(products[0]?.id))}><Plus />New offer</Button>}</div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-300">Product<select value={form.productId} onChange={(event) => set("productId", event.target.value)} disabled={Boolean(form.offerId)} className={inputClass}>{products.map((product) => <option key={product.id} value={product.id}>{product.categorySlug.replaceAll("-"," ")} · {product.canonicalName}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-300">Retailer<input list="retailer-options" value={form.retailerName} onChange={(event) => chooseRetailer(event.target.value)} disabled={Boolean(form.offerId)} className={inputClass} placeholder="Best Buy" /><datalist id="retailer-options">{retailers.map((retailer) => <option key={retailer.id} value={retailer.name} />)}</datalist></label>
        <label className="text-sm font-bold text-slate-300">Retailer homepage<input type="url" value={form.retailerUrl} onChange={(event) => set("retailerUrl", event.target.value)} className={inputClass} placeholder="https://www.example.com" /></label>
        <label className="text-sm font-bold text-slate-300">Offer destination<input type="url" value={form.destinationUrl} onChange={(event) => set("destinationUrl", event.target.value)} className={inputClass} placeholder="https://www.example.com/product" /></label>
        <label className="text-sm font-bold text-slate-300">Price (USD)<input inputMode="decimal" value={form.price} onChange={(event) => set("price", event.target.value)} className={inputClass} placeholder="399.00" /></label>
        <label className="text-sm font-bold text-slate-300">Shipping (blank if unknown)<input inputMode="decimal" value={form.shipping} onChange={(event) => set("shipping", event.target.value)} className={inputClass} placeholder="0.00" /></label>
        <label className="text-sm font-bold text-slate-300">Availability<select value={form.availability} onChange={(event) => set("availability", event.target.value)} className={inputClass}><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option><option value="preorder">Preorder</option><option value="unknown">Unknown</option></select></label>
        <label className="text-sm font-bold text-slate-300">Relationship<select value={form.affiliateStatus} onChange={(event) => set("affiliateStatus", event.target.value)} className={inputClass}><option value="none">No affiliate relationship</option><option value="affiliate">Affiliate</option><option value="sponsored">Sponsored placement</option></select></label>
        <label className="text-sm font-bold text-slate-300">Checked at<div className="flex gap-2"><input type="datetime-local" value={form.checkedAt} onChange={(event) => set("checkedAt", event.target.value)} className={inputClass} /><Button type="button" variant="outline" className="mt-2" onClick={() => set("checkedAt", nowForInput())} aria-label="Set checked time to now"><RefreshCw /></Button></div></label>
        <label className="text-sm font-bold text-slate-300">Publishing state<select value={form.status} onChange={(event) => set("status", event.target.value)} className={inputClass}><option value="draft">Draft</option><option value="approved">Approved and public</option></select></label>
      </div>
      <Button type="button" size="lg" onClick={save} disabled={Boolean(busy)} className="mt-6 rounded-xl font-black">{busy === "save" ? <Loader2 className="animate-spin" /> : <Check />}{form.offerId ? "Save changes" : "Add offer"}</Button>
      {error && <p className="mt-4 rounded-xl bg-rose-300/10 p-3 text-sm text-rose-200">{error}</p>}
      {success && <p className="mt-4 rounded-xl bg-emerald-300/10 p-3 text-sm text-emerald-200">{success}</p>}
    </section>

    <section aria-labelledby="offer-list-heading"><div><p className="section-kicker">Offer inventory</p><h2 id="offer-list-heading" className="mt-1 font-display text-2xl font-black text-white">Current retailer offers</h2></div>{offers.length === 0 ? <div className="mt-5 rounded-3xl border border-dashed border-white/15 p-8"><p className="font-bold text-white">No offers yet.</p><p className="mt-2 text-sm text-slate-400">Add the first verified manual offer above. Public pages already handle this empty state safely.</p></div> : <div className="mt-5 grid gap-3">{offers.map((offer) => { const product = products.find((item) => item.id === offer.productId); return <article key={offer.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">{offer.retailerName}</p><h3 className="mt-1 font-black text-white">{product?.canonicalName ?? "Unknown product"}</h3><p className="mt-2 text-sm text-slate-400">${dollars(offer.priceMinor)} · {offer.availability.replaceAll("_", " ")} · {offer.status}</p></div><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => edit(offer)} disabled={Boolean(busy)}><Edit3 />Edit</Button><Button variant="ghost" size="sm" onClick={() => changeStatus(offer, offer.status === "approved" ? "disable" : "approve")} disabled={Boolean(busy)}>{busy === offer.id ? <Loader2 className="animate-spin" /> : <Power />}{offer.status === "approved" ? "Disable" : "Approve"}</Button></div></div></article>; })}</div>}</section>
  </div>;
}
