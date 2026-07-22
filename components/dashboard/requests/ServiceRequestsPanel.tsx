"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ServiceCatalogItem } from "@/lib/credits/catalog";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

type RequestRow = {
  id: string;
  type: string;
  status: string;
  title: string;
  notes: string;
  creditCost: number;
  createdAt: string;
};

type Props = {
  restaurantId: string;
  creditBalance: number;
  catalog: ServiceCatalogItem[];
  initialRequests: RequestRow[];
  isPaid: boolean;
  billingHref: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "REQUESTED":
      return "Queued for our team";
    case "IN_PROGRESS":
      return "In progress";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export function ServiceRequestsPanel({
  restaurantId,
  creditBalance: initialBalance,
  catalog,
  initialRequests,
  isPaid,
  billingHref,
}: Props) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [requests, setRequests] = useState(initialRequests);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [notesByType, setNotesByType] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function requestService(type: string, title: string, cost: number) {
    setBusyType(type);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          type,
          notes: notesByType[type]?.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        creditBalance?: number;
        needed?: number;
        request?: RequestRow;
        upgradeRequired?: boolean;
      };
      if (!res.ok) {
        if (res.status === 402) {
          setError(
            `Not enough credits for ${title} (${cost} needed${data.creditBalance != null ? `, ${data.creditBalance} available` : ""}).`,
          );
        } else {
          setError(data.error ?? "Could not submit request.");
        }
        return;
      }
      if (typeof data.creditBalance === "number") setBalance(data.creditBalance);
      if (data.request) {
        setRequests((prev) => [
          {
            ...data.request!,
            createdAt:
              typeof data.request!.createdAt === "string"
                ? data.request!.createdAt
                : new Date(data.request!.createdAt).toISOString(),
          },
          ...prev,
        ]);
      }
      setMsg(data.message ?? `Requested ${title}.`);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className={`${appCardSurface} border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40`}>
        <p className="type-caption font-medium uppercase tracking-wide text-emerald-800">Your plan credits</p>
        <p className="mt-2 text-4xl font-semibold tabular-nums text-[var(--color-ink)]">{balance}</p>
        <p className="type-body-sm mt-2 max-w-xl text-[var(--color-muted)]">
          Credits refresh monthly on paid plans. Spend them to request website, logo, SEO, or creative work —
          our team delivers it manually after you pay.
        </p>
        {!isPaid ? (
          <a href={billingHref} className={`${appBtnPrimary} mt-4 inline-flex rounded-full bg-emerald-700`}>
            Upgrade to unlock credits
          </a>
        ) : null}
      </section>

      {error ? <p className="type-body-sm text-red-700">{error}</p> : null}
      {msg ? <p className="type-body-sm text-emerald-800">{msg}</p> : null}

      <section>
        <h2 className="type-title-sm">Request a deliverable</h2>
        <p className="type-body-sm mt-2 text-[var(--color-muted)]">
          Nothing is auto-built. You request — we fulfill. Credits are deducted when you submit.
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {catalog.map((item) => {
            const canAfford = balance >= item.creditCost;
            return (
              <li key={item.type} className={appCardSurface}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="type-label-md text-[var(--color-ink)]">{item.title}</h3>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 type-caption font-medium text-emerald-900">
                    {item.creditCost} credits
                  </span>
                </div>
                <p className="type-body-sm mt-2 text-[var(--color-muted)]">{item.description}</p>
                <label className="mt-3 block">
                  <span className="type-caption text-[var(--color-muted-medium)]">Notes (optional)</span>
                  <textarea
                    rows={2}
                    value={notesByType[item.type] ?? ""}
                    onChange={(e) =>
                      setNotesByType((prev) => ({ ...prev, [item.type]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-2xl border border-[var(--color-hairline)] px-3 py-2 type-body-sm"
                    placeholder="Anything we should know…"
                  />
                </label>
                <button
                  type="button"
                  disabled={!isPaid || busyType !== null || !canAfford}
                  className={`${appBtnPrimary} mt-4 rounded-full bg-emerald-700 disabled:opacity-50`}
                  onClick={() => void requestService(item.type, item.title, item.creditCost)}
                >
                  {busyType === item.type
                    ? "Submitting…"
                    : !isPaid
                      ? "Upgrade to request"
                      : !canAfford
                        ? "Need more credits"
                        : `Request · ${item.creditCost} credits`}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={appCardSurface}>
        <h2 className="type-title-sm">Your requests</h2>
        {requests.length === 0 ? (
          <p className="type-body-sm mt-3 text-[var(--color-muted)]">No requests yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-3 last:border-0"
              >
                <div>
                  <p className="type-label-md text-[var(--color-ink)]">{r.title}</p>
                  <p className="type-caption text-[var(--color-muted-medium)]">
                    {statusLabel(r.status)} · {r.creditCost} credits ·{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  {r.notes ? (
                    <p className="type-caption mt-1 text-[var(--color-muted)]">{r.notes}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-[var(--color-muted-faint)] px-3 py-1 type-caption">
                  {r.status.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
        {requests.some((r) => r.status === "REQUESTED" || r.status === "IN_PROGRESS") ? (
          <p className="type-caption mt-4 text-[var(--color-muted-medium)]">
            Open requests are in our queue — we update status when work starts or ships.
          </p>
        ) : null}
        <button type="button" className={`${appBtnSecondary} mt-4`} onClick={() => router.refresh()}>
          Refresh
        </button>
      </section>
    </div>
  );
}
