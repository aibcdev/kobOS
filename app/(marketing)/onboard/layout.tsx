import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Find your restaurant",
  description:
    "Find your restaurant and see what KOB finds on your Google listing, reviews and website. 7 days free, no card.",
  path: "/onboard",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
