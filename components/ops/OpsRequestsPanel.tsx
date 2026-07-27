"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

export type OpsTicket = {
  id: string;
  type: string;
  typeLabel: string;
  status: string;
  title: string;
  notes: string;
  creditCost: number;
  createdAt: string;
  restaurantId: string;
  restaurantName: string;
  city: string | null;
  website: string | null;
  ownerEmail: string | null;
};

export function OpsRequestsPanel({
  initialOpen,
  initialDelivered,
}: {
  initialOpen: OpsTicket[];
  initialDelivered: Array<{
    id: string;
    title: string;
    restaurantName: string;
    deliveredAt: string | null;
  }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [delivered, setDelivered] = useState(initialDelivered);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(id: string, status: "IN_PROGRESS" | "DELIVERED" | "CANCELLED") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/ops/service-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update ticket");
        return;
      }
      const ticket = open.find((t) => t.id === id);
      if (status === "DELIVERED" && ticket) {
        setDelivered((prev) => [
          {
            id: ticket.id,
            title: ticket.title,
            restaurantName: ticket.restaurantName,
            deliveredAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setOpen((prev) =>
        status === "DELIVERED" || status === "CANCELLED"
          ? prev.filter((t) => t.id !== id)
          : prev.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">
          Open tickets ({open.length})
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Like a kitchen ticket rail — pick up (In progress), do the work, mark Delivered.
        </p>
        {open.length === 0 ? (
          <p className={`mt-4 ${appCardSurface} text-sm text-[var(--color-muted)]`}>Queue is empty.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {open.map((t) => (
              <li key={t.id} className={appCardSurface}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)] uppercase">
                      {t.typeLabel} · {t.status.replace(/_/g, " ")} · {t.creditCost} credits
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-[var(--color-ink)]">{t.title}</h3>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {t.restaurantName}
                      {t.city ? ` · ${t.city}` : ""}
                      {t.ownerEmail ? ` · ${t.ownerEmail}` : ""}
                    </p>
                    {t.website ? (
                      <a
                        href={t.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm text-[var(--color-primary)] underline"
                      >
                        {t.website}
                      </a>
                    ) : null}
                    {t.notes ? (
                      <p className="mt-2 text-sm text-[var(--color-ink)]">Notes: {t.notes}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-[var(--color-muted-medium)]">
                      Queued {new Date(t.createdAt).toLocaleString()} · {t.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.status === "REQUESTED" ? (
                      <button
                        type="button"
                        disabled={busyId === t.id}
                        className={appBtnPrimary}
                        onClick={() => void setStatus(t.id, "IN_PROGRESS")}
                      >
                        Pick up
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === t.id}
                      className={appBtnPrimary}
                      onClick={() => void setStatus(t.id, "DELIVERED")}
                    >
                      Mark delivered
                    </button>
                    <button
                      type="button"
                      disabled={busyId === t.id}
                      className={appBtnSecondary}
                      onClick={() => void setStatus(t.id, "CANCELLED")}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {delivered.length > 0 ? (
        <section className={appCardSurface}>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Recently delivered</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
            {delivered.map((d) => (
              <li key={d.id}>
                {d.restaurantName} — {d.title}
                {d.deliveredAt ? ` · ${new Date(d.deliveredAt).toLocaleString()}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
