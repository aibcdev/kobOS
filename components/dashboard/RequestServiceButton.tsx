"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { appBtnPrimary } from "@/lib/app-ui-classes";

type Props = {
  restaurantId: string;
  type: string;
  title: string;
  creditCost: number;
  isPaid: boolean;
  billingHref: string;
  /** Existing open request status for this type, if any. */
  openStatus?: string | null;
  label?: string;
  className?: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "REQUESTED":
      return "Requested";
    case "IN_PROGRESS":
      return "In progress";
    case "DELIVERED":
      return "Delivered";
    default:
      return status.replace(/_/g, " ");
  }
}

export function RequestServiceButton({
  restaurantId,
  type,
  title,
  creditCost,
  isPaid,
  billingHref,
  openStatus,
  label,
  className,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(openStatus ?? null);

  async function request() {
    if (!isPaid) {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId, tier: "starter" }),
        });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setError(data.error ?? "Could not start trial checkout.");
          return;
        }
        window.location.href = data.url;
      } catch {
        setError("Network error — could not start trial.");
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, type }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        request?: { status?: string };
        upgradeRequired?: boolean;
      };
      if (!res.ok) {
        if (res.status === 409) {
          setStatus("REQUESTED");
          setError(null);
          return;
        }
        if (data.upgradeRequired) {
          window.location.href = billingHref;
          return;
        }
        setError(data.error ?? "Could not submit request.");
        return;
      }
      setStatus(data.request?.status ?? "REQUESTED");
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "REQUESTED" || status === "IN_PROGRESS" || status === "DELIVERED") {
    return (
      <div className={className}>
        <span className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-muted-faint)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)]">
          {statusLabel(status)}
          {status === "REQUESTED" ? " — our team will pick this up" : null}
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void request()}
        className={`${appBtnPrimary} disabled:opacity-50`}
      >
        {busy
          ? "Submitting…"
          : !isPaid
            ? "Start 7-day free trial (card)"
            : label ?? `Request · ${creditCost} credits`}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {!error && title ? (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          {title} — status becomes Requested; we fulfill manually.
        </p>
      ) : null}
    </div>
  );
}
