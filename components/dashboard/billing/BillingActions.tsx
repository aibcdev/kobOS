"use client";

import { useState } from "react";
import { appBtnPrimary, appBtnSecondary } from "@/lib/app-ui-classes";

export function BillingActions({
  restaurantId,
  hasStripeCustomer,
  stripeReady,
}: {
  restaurantId: string;
  hasStripeCustomer: boolean;
  stripeReady: boolean;
}) {
  const [busy, setBusy] = useState<null | "starter" | "pro" | "portal">(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(tier: "starter" | "pro") {
    setError(null);
    setBusy(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout failed");
        setBusy(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error");
      setBusy(null);
    }
  }

  async function portal() {
    setError(null);
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Portal failed");
        setBusy(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {!stripeReady ? (
        <p className="type-body-sm text-amber-800">
          Set <code className="rounded bg-[var(--color-muted-faint)] px-1 font-mono text-[12px]">STRIPE_SECRET_KEY</code>
          , <code className="rounded bg-[var(--color-muted-faint)] px-1 font-mono text-[12px]">STRIPE_PRICE_STARTER</code>
          , and <code className="rounded bg-[var(--color-muted-faint)] px-1 font-mono text-[12px]">STRIPE_PRICE_PRO</code>{" "}
          to enable live checkout.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={Boolean(busy) || !stripeReady}
          onClick={() => void checkout("starter")}
          className={appBtnSecondary}
        >
          {busy === "starter" ? "Redirecting…" : "Subscribe · Starter"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || !stripeReady}
          onClick={() => void checkout("pro")}
          className={appBtnPrimary}
        >
          {busy === "pro" ? "Redirecting…" : "Subscribe · Pro"}
        </button>
        {hasStripeCustomer ? (
          <button
            type="button"
            disabled={Boolean(busy) || !stripeReady}
            onClick={() => void portal()}
            className={appBtnSecondary}
          >
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </button>
        ) : null}
      </div>
      {error ? <p className="type-body-sm text-red-700">{error}</p> : null}
      <p className="type-caption text-[var(--color-muted-medium)]">
        Webhook URL: <span className="font-mono">/api/stripe/webhook</span> — set{" "}
        <span className="font-mono">STRIPE_WEBHOOK_SECRET</span> in production.
      </p>
    </div>
  );
}
