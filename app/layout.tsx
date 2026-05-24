import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { defaultSiteMeta } from "@/lib/homepage-defaults";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: defaultSiteMeta.title,
  description: defaultSiteMeta.description,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "KOB",
    title: defaultSiteMeta.title,
    description: defaultSiteMeta.description,
    url: getSiteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: defaultSiteMeta.title,
    description: defaultSiteMeta.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full bg-[var(--color-surface-soft)] text-[var(--color-body)]">{children}</body>
    </html>
  );
}
