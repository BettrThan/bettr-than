import type { Metadata } from "next";
import { ExtendedCategoryPage } from "@/components/extended-category-page";

export const metadata: Metadata = {
  title: "Portable Bluetooth Speakers",
  description: "Compare verified portable speaker specs, transparent scores, prices, and community votes.",
  alternates: { canonical: "/category/portable-speakers" },
  openGraph: { type: "website", url: "/category/portable-speakers", title: "Portable Bluetooth Speakers", description: "Compare verified portable speaker specs, transparent scores, prices, and community votes.", images: [{ url: "/products/portable-speakers.jpg", alt: "Portable Bluetooth speaker" }] },
  twitter: { card: "summary_large_image", title: "Portable Bluetooth Speakers", description: "Compare verified portable speaker specs, transparent scores, prices, and community votes.", images: ["/products/portable-speakers.jpg"] },
};

export default function PortableSpeakersPage(){return <ExtendedCategoryPage category="portable-speakers"/>;}
