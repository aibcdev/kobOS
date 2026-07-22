"use client";

import { useEffect, useState } from "react";
import type { ScanPreviewSeoChecks } from "@/lib/marketing/audit-scan-preview";

type SeoCheckId =
  | "title"
  | "meta"
  | "h1"
  | "schema"
  | "og"
  | "robots"
  | "sitemap"
  | "alts";

const CHECK_DEFS: { id: SeoCheckId; label: string }[] = [
  { id: "title", label: "Title tag" },
  { id: "meta", label: "Meta description" },
  { id: "h1", label: "Page headings" },
  { id: "schema", label: "Structured data" },
  { id: "og", label: "Open Graph preview" },
  { id: "robots", label: "robots.txt" },
  { id: "sitemap", label: "XML sitemap" },
  { id: "alts", label: "Image alt text" },
];

const REVEAL_MS = 850;

/**
 * TypeUI-inspired SEO checklist revealed during the Owner-style website phase.
 * Uses real signals when the poll has them; otherwise ticks theatrically.
 */
export function AuditScanningSeoChecks({ checks }: { checks?: ScanPreviewSeoChecks | null }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    const timers: number[] = [];
    for (let i = 1; i <= CHECK_DEFS.length; i++) {
      timers.push(
        window.setTimeout(() => setRevealed(i), i * REVEAL_MS),
      );
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [checks]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-4 py-4 shadow-[var(--shadow-card)]">
      <p className="type-caption mb-3 font-medium tracking-wide text-[var(--color-muted-medium)] uppercase">
        Website SEO
      </p>
      <ul className="flex flex-col gap-2.5">
        {CHECK_DEFS.map((def, idx) => {
          const visible = idx < revealed;
          const known = checks?.[def.id];
          const state: "pending" | "pass" | "fail" | "checking" = !visible
            ? "pending"
            : known === true
              ? "pass"
              : known === false
                ? "fail"
                : "checking";

          return (
            <li
              key={def.id}
              className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
                visible ? "opacity-100" : "opacity-35"
              }`}
            >
              <CheckGlyph state={state} />
              <span
                className={
                  state === "fail"
                    ? "text-[var(--color-muted)]"
                    : "text-[var(--color-ink)]"
                }
              >
                {def.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CheckGlyph({ state }: { state: "pending" | "pass" | "fail" | "checking" }) {
  if (state === "pass") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-[10px] text-white"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  if (state === "fail") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[10px] text-[var(--color-muted-medium)]"
        aria-hidden
      >
        !
      </span>
    );
  }
  if (state === "checking") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-accent)] border-t-transparent"
        aria-hidden
      >
        <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </span>
    );
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]"
      aria-hidden
    />
  );
}
