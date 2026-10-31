import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Free restaurant scan",
  description:
    "Search for your restaurant and get a free scan of your Google listing, reviews and website. No card.",
  path: "/scan",
  // A search box that hands off to /onboard; /go/audit is the indexed free-audit page.
  noindex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
