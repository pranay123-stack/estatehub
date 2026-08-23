import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Root metadata. `metadataBase` makes every relative OG image absolute, and
 * the title template gives each page "<Page> | EstateHub" for free.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EstateHub — Buy, rent and list property in India",
    template: "%s | EstateHub",
  },
  description:
    "Search verified apartments, villas, plots and commercial property for sale or rent across Mumbai, Bengaluru, Delhi, Pune, Hyderabad and more.",
  keywords: ["real estate", "property", "buy", "rent", "apartment", "villa", "plot", "India"],
  openGraph: {
    type: "website",
    siteName: "EstateHub",
    title: "EstateHub — Buy, rent and list property in India",
    description: "Verified property listings from owners and agents across India.",
    url: siteUrl,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
