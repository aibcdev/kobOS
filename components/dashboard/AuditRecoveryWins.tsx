"use client";

import { useCallback, useEffect, useState } from "react";
import { appBtnPrimary, appCardSurface } from "@/lib/app-ui-classes";

type Win = {
  key: string;
  title: string;
  detail: string;
  customersPerMonth: number;
};

type FixRequest = {
  id: string;
  title: string;
  notes: string;
  status: string;
  createdAt: string;
};

function statusForWin(win: Win, requests: FixRequest[]): string | null {
  const match = requests.find(
    (r) =>
      r.title === win.title ||
      r.notes.includes(`fixKey=${win.key}`) ||
      r.notes.toLowerCase().includes(win.title.toLowerCase()),
  );
  if (!match) return null;
  if (match.status === "DELIVERED") return "Delivered";
  if (match.status === "IN_PROGRESS") return "In progress";
  if (match.status === "CANCELLED") return null;
  return "Requested";
}

/**
 * The same three audit wins — click → Pending + operator email for manual fulfillment.
 */
export function AuditRecoveryWins({ restaurantId }: { restaurantId: string }) {
  const [wins, setWins] = useState<Win[]>([]);
  const [requests, setRequests] = useState<FixRequest[]>([]);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/audit-fixes?restaurantId=${encodeURIComponent(restaurantId)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setLoaded(true);
      return;
    }
    const data = (await res.json()) as {
      wins?: Win[];
      requests?: FixRequest[];
      auditId?: string | null;
    };
    setWins(data.wins ?? []);
    setRequests(data.requests ?? []);
    setAuditId(data.auditId ?? null);
    setLoaded(true);
  }, [restaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestFix(win: Win) {
    setBusyKey(win.key);
    setError(null);
    try {
      const res = await fetch("/api/audit-fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          fixKey: win.key,
          title: win.title,
          detail: win.detail,
          auditId: auditId ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        request?: FixRequest;
        message?: string;
        upgradeRequired?: boolean;
      };
      if (!res.ok) {
        if (data.upgradeRequired) {
          try {
            const checkout = await fetch("/api/billing/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ restaurantId, tier: "starter" }),
            });
            const checkoutData = (await checkout.json().catch(() => ({}))) as {
              url?: string;
              error?: string;
            };
            if (checkout.ok && checkoutData.url) {
              window.location.href = checkoutData.url;
              return;
            }
            setError(checkoutData.error ?? "Start a free trial to request fixes.");
            return;
          } catch {
            setError("Could not start trial checkout.");
            return;
          }
        }
        setError(data.error ?? "Could not submit request.");
        return;
      }
      if (data.request) {
        setRequests((prev) => {
          const next = prev.filter((r) => r.id !== data.request!.id);
          return [
            {
              ...data.request!,
              createdAt:
                typeof data.request!.createdAt === "string"
                  ? data.request!.createdAt
                  : new Date().toISOString(),
            },
            ...next,
          ];
        });
      } else {
        await load();
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!loaded || wins.length === 0) return null;

  return (
    <section className={`${appCardSurface} mb-8`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
        From your audit
      </p>
      <h2 className="type-title-sm mt-1">Start recovering customers</h2>
      <p className="type-body-sm mt-2 text-[var(--color-muted)]">
        Tap a fix and we&apos;ll mark it Requested — KOB handles it for you. A click is never marked
        done until we deliver.
      </p>

      <ol className="mt-6 space-y-4">
        {wins.map((win, i) => {
          const status = statusForWin(win, requests);
          const requested = status === "Requested" || status === "In progress";
          const delivered = status === "Delivered";
          return (
            <li
              key={win.key}
              className="flex flex-col gap-3 border-b border-[var(--color-hairline)] pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-bold text-[var(--color-primary)]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-ink)]">{win.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">{win.detail}</p>
                  {win.customersPerMonth > 0 ? (
                    <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">
                      +{win.customersPerMonth.toLocaleString("en-GB")} customers / month
                    </p>
                  ) : null}
                </div>
              </div>
              {delivered ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
                  Delivered
                </span>
              ) : requested ? (
                <span className="shrink-0 rounded-full bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
                  {status}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busyKey === win.key}
                  onClick={() => void requestFix(win)}
                  className={`${appBtnPrimary} shrink-0 text-sm`}
                >
                  {busyKey === win.key ? "Requesting…" : "Fix this"}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {error ? <p className="type-body-sm mt-4 text-[var(--color-error)]">{error}</p> : null}
    </section>
  );
}
