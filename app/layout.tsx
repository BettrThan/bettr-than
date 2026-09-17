import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bettrthan.com"),
  title: {
    default: "Bettr Than — Find What's Actually Better",
    template: "%s | Bettr Than",
  },
  description: "Compare products with verified specifications, transparent scoring, and community votes.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Bettr Than", url: "/", title: "Bettr Than — Find What's Actually Better", description: "Compare products with verified specifications, transparent scoring, and community votes." },
  twitter: { card: "summary", title: "Bettr Than — Find What's Actually Better", description: "Compare products with verified specifications, transparent scoring, and community votes." },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
