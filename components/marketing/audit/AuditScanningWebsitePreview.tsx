"use client";

import { useState } from "react";
import { decodeHtmlEntities } from "@/lib/marketing/decode-html-entities";

export function AuditScanningWebsitePreview({
  websiteUrl,
  imageUrl,
}: {
  websiteUrl: string;
  imageUrl?: string | null;
}) {
  const display = websiteUrl
    ? websiteUrl.replace(/^https?:\/\//i, "").slice(0, 56)
    : "yourrestaurant.com";
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="mx-auto w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[var(--color-surface-cream)] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
        <span className="type-caption ml-2 flex-1 truncate rounded-md bg-white px-3 py-1.5 text-[var(--color-muted-medium)]">
          {display}
        </span>
      </div>
      <div className="relative aspect-[16/10] bg-gradient-to-br from-[var(--color-surface-warm)] to-white">
        {!imageUrl || !loaded ? (
          <div className="absolute inset-0 flex flex-col gap-3 p-8 opacity-50">
            <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--color-muted-faint)]" />
            <div className="mt-4 h-32 w-full animate-pulse rounded-lg bg-[var(--color-muted-faint)]" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 animate-pulse rounded bg-[var(--color-muted-faint)]" />
              <div className="h-16 animate-pulse rounded bg-[var(--color-muted-faint)]" />
              <div className="h-16 animate-pulse rounded bg-[var(--color-muted-faint)]" />
            </div>
          </div>
        ) : null}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Screenshot of ${display}`}
            className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/90 to-transparent px-6 py-4">
          <p className="type-caption text-center text-[var(--color-muted-medium)]">
            Scanning {decodeHtmlEntities(display)}
          </p>
        </div>
      </div>
    </div>
  );
}
