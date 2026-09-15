import type { Metadata } from "next";
import { Caveat, DM_Sans, Instrument_Serif } from "next/font/google";
import { defaultSiteMeta } from "@/lib/homepage-defaults";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import "./kob-employee.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const caveat = Caveat({
  variable: "--font-accent-script",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
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
    <html
      lang="en"
      className={`${dmSans.variable} ${caveat.variable} ${instrumentSerif.variable} h-full scroll-smooth antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500;6..96,600&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[var(--color-surface-soft)] text-[var(--color-body)]">{children}</body>
    </html>
  );
}
