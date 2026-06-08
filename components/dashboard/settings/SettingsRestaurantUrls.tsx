"use client";

import { useState } from "react";
import { appBtnPrimary, appCardSurface } from "@/lib/app-ui-classes";

export function SettingsRestaurantUrls({
  restaurantId,
  website,
  googleBusinessUrl,
}: {
  restaurantId: string;
  website: string | null;
  googleBusinessUrl: string | null;
}) {
  const [site, setSite] = useState(website ?? "");
  const [gbp, setGbp] = useState(googleBusinessUrl ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/restaurant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, website: site.trim() || null, googleBusinessUrl: gbp.trim() || null }),
      });
      const body = (await res.json()) as { error?: string };
      setMsg(res.ok ? "Saved." : body.error ?? "Could not save.");
    } catch {
      setMsg("Network error.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={(e) => void save(e)} className={`mt-10 ${appCardSurface}`}>
      <h2 className="type-title-sm">Restaurant online</h2>
      <p className="type-body-sm mt-2 text-[var(--color-muted)]">Used by your audit, website strategist, and Chief of Staff.</p>
      <label className="mt-4 block type-body-sm">
        Website URL
        <input
          type="url"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="https://yourrestaurant.com"
          className="mt-1 w-full rounded-[var(--radius-default)] border border-[var(--color-hairline)] px-3 py-2"
        />
      </label>
      <label className="mt-4 block type-body-sm">
        Google Business Profile URL
        <input
          type="url"
          value={gbp}
          onChange={(e) => setGbp(e.target.value)}
          placeholder="https://maps.google.com/..."
          className="mt-1 w-full rounded-[var(--radius-default)] border border-[var(--color-hairline)] px-3 py-2"
        />
      </label>
      <button type="submit" disabled={busy} className={`${appBtnPrimary} mt-4`}>
        {busy ? "Saving…" : "Save URLs"}
      </button>
      {msg ? <p className="type-body-sm mt-2 text-[var(--color-muted)]">{msg}</p> : null}
    </form>
  );
}
