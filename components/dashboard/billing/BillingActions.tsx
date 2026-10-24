"use client";

import { useState } from "react";
import { appBtnPrimary, appBtnSecondary } from "@/lib/app-ui-classes";

/** One button: add a card (Stripe Checkout at this restaurant's price) or manage the card already on file. */
export function BillingActions({
  restaurantId,
  action,
  priceLabel,
  cardsOn,
}: {
  restaurantId: string;
  action: "add_card" | "manage";
  priceLabel: string;
  cardsOn: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(action === "manage" ? "/api/billing/portal" : "/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "That didn't work. Nothing has been charged — please try again.");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Nothing has been charged.");
      setBusy(false);
    }
  }

  if (!cardsOn) return <p className="type-body-sm text-[var(--color-muted)]">Card payments open soon. Nothing will be charged until then.</p>;
  return (
    <div className="space-y-3">
      <button type="button" disabled={busy} onClick={() => void go()} className={action === "manage" ? appBtnSecondary : appBtnPrimary}>
        {busy ? "Opening…" : action === "manage" ? "Manage card or cancel" : `Add a card · ${priceLabel}/month`}
      </button>
      {error ? <p className="type-body-sm text-red-700">{error}</p> : null}
    </div>
  );
}
