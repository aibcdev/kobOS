import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Data management policy",
  description:
    "What data KOB uses, where it comes from, and how drafts stay private until you approve them.",
  path: "/data-management",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
