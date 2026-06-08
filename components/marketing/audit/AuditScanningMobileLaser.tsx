"use client";

import { useState } from "react";

/** Owner grader — phone outline with moving green scan line. */
export function AuditScanningMobileLaser({ imageUrl }: { imageUrl?: string | null }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[280px] flex-col items-center">
      <div className="relative w-[220px] rounded-[2rem] border-[3px] border-[var(--color-ink)] bg-[var(--color-surface-warm)] p-3 shadow-[var(--shadow-card-elevated)]">
        <div className="overflow-hidden rounded-[1.35rem] bg-white">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] text-[var(--color-muted-medium)]">
            <span>9:41</span>
            <span aria-hidden>▮▮ ⌁ ▮</span>
          </div>
          <div className="relative h-[320px] overflow-hidden bg-gradient-to-b from-[var(--color-surface-cream)] to-white">
            {!imageUrl || !loaded ? (
              <div className="space-y-3 p-4 opacity-60">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-muted-faint)]" />
                <div className="h-24 w-full animate-pulse rounded-lg bg-[var(--color-muted-faint)]" />
                <div className="h-3 w-full animate-pulse rounded bg-[var(--color-muted-faint)]" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--color-muted-faint)]" />
              </div>
            ) : null}
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setLoaded(true)}
              />
            ) : null}
            <div
              className="grader-laser-line pointer-events-none absolute inset-x-0 h-1 bg-[var(--color-accent)] shadow-[0_0_12px_2px_rgba(8,137,36,0.55)]"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}
