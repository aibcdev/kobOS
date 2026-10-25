"use client";

import { usePathname } from "next/navigation";
import { markdownPathFor } from "@/lib/marketing/markdown-pages";

/**
 * <link rel="alternate" type="text/markdown"> to this page's Markdown copy. React hoists it into <head>, including
 * in the server-rendered HTML, so crawlers see it without running scripts.
 */
export function MarkdownAlternate() {
  const href = markdownPathFor(usePathname() ?? "");
  return href ? <link rel="alternate" type="text/markdown" href={href} /> : null;
}
