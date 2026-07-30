"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

export function SeoKeywordTools({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState<null | "add">(null);
  const [error, setError] = useState<string | null>(null);

  async function addKeyword() {
    const k = keyword.trim();
    if (k.length < 2) return;
    setError(null);
    setBusy("add");
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, keyword: k }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.status === 402) {
        setError("Free plan allows 3 tracked keywords. Upgrade to Starter for unlimited.");
        setBusy(null);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Failed to add keyword");
        setBusy(null);
        return;
      }
      setKeyword("");
      router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(null);
  }

  return (
    <div className={`${appCardSurface} mt-8`}>
      <h2 className="type-title-sm">Keyword workspace</h2>
      <p className="type-body-sm mt-2 text-[var(--color-muted)]">
        Free: up to 3 keywords. Starter+: unlimited. Rank and search volume stay blank until live
        rank tracking is connected — we&apos;d rather show nothing than a made-up position.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="type-caption text-[var(--color-muted-medium)]">Add keyword</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm"
            placeholder="e.g. best tacos downtown"
          />
        </label>
        <button type="button" disabled={busy !== null || keyword.trim().length < 2} onClick={() => void addKeyword()} className={appBtnPrimary}>
          {busy === "add" ? "Saving…" : "Add"}
        </button>
      </div>
      {error ? <p className="type-body-sm mt-3 text-red-700">{error}</p> : null}
    </div>
  );
}
