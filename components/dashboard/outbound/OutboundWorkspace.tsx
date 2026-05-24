"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

type LeadRow = {
  id: string;
  city: string | null;
  restaurantName: string | null;
  contactEmail: string | null;
  insightSummary: string | null;
  messageSubject: string | null;
  messageBody: string | null;
  suggestedTone: string | null;
  status: string;
  createdAt: string;
};

export function OutboundWorkspace({ leads, restaurantId }: { leads: LeadRow[]; restaurantId: string }) {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [max, setMax] = useState(10);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recipientById, setRecipientById] = useState<Record<string, string>>({});

  useEffect(() => {
    setRecipientById(Object.fromEntries(leads.map((l) => [l.id, l.contactEmail ?? ""])));
  }, [leads]);

  async function runDraft() {
    setDraftError(null);
    setDrafting(true);
    try {
      const res = await fetch("/api/growth-agent/outbound-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), max, restaurantId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; inserted?: number };
      if (!res.ok) {
        setDraftError(
          res.status === 402 ? "Pro plan required — open Billing to upgrade." : (data.error ?? "Request failed"),
        );
        setDrafting(false);
        return;
      }
      setCity("");
      router.refresh();
    } catch {
      setDraftError("Network error");
    }
    setDrafting(false);
  }

  async function patchLead(id: string, status: "APPROVED" | "ARCHIVED") {
    setBusyId(id);
    const email = recipientById[id]?.trim();
    if (status === "APPROVED" && !email) {
      alert("Add a recipient email before approving. Inngest + Resend uses it for the send job.");
      setBusyId(null);
      return;
    }
    try {
      const res = await fetch(`/api/outbound-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          status,
          ...(status === "APPROVED" ? { contactEmail: email } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Update failed");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-[var(--spacing-md)] py-10">
      <div>
        <h1 className="type-title-md">Outbound drafts</h1>
        <p className="type-body-md mt-2 text-[var(--color-muted)]">
          AI-generated outreach drafts for human review. Approve with a real recipient email to queue sends via Resend
          (Inngest batch job + <code className="rounded bg-[var(--color-muted-faint)] px-1 font-mono text-[12px]">CRON_SECRET</code>{" "}
          HTTP trigger). Respect CAN-SPAM and platform rules before you contact anyone.
        </p>
      </div>

      <section className={appCardSurface}>
        <h2 className="type-title-sm">Generate new drafts</h2>
        <p className="type-body-sm mt-2 text-[var(--color-muted)]">
          Uses <code className="rounded bg-[var(--color-muted-faint)] px-1 font-mono text-[12px]">OPENAI_API_KEY</code>.
          Daily cron can also run when{" "}
          <code className="rounded bg-[var(--color-muted-faint)] px-1 font-mono text-[12px]">OUTBOUND_SCAN_CITY</code>{" "}
          is set (Inngest).
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="type-caption text-[var(--color-muted-medium)]">City</span>
            <input
              className="rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Austin"
            />
          </label>
          <label className="flex w-full flex-col gap-1 sm:w-28">
            <span className="type-caption text-[var(--color-muted-medium)]">Max leads</span>
            <input
              type="number"
              min={1}
              max={20}
              className="rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm"
              value={max}
              onChange={(e) => setMax(Number(e.target.value) || 10)}
            />
          </label>
          <button type="button" disabled={drafting || !city.trim()} onClick={runDraft} className={appBtnPrimary}>
            {drafting ? "Generating…" : "Run draft scan"}
          </button>
        </div>
        {draftError ? <p className="type-body-sm mt-3 text-red-700">{draftError}</p> : null}
      </section>

      <section>
        <h2 className="type-title-sm">Queue ({leads.length})</h2>
        <p className="type-caption mt-1 text-[var(--color-muted-medium)]">DRAFT · PENDING_APPROVAL (approved leads leave this queue)</p>
        {leads.length === 0 ? (
          <p className={`${appCardSurface} type-body-sm mt-4 text-[var(--color-muted)]`}>No leads in queue.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {leads.map((lead) => (
              <li key={lead.id} className={appCardSurface}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="type-label-md text-[var(--color-ink)]">{lead.restaurantName ?? "Unknown venue"}</p>
                    <p className="type-caption text-[var(--color-muted-medium)]">
                      {lead.city ?? "—"} · {lead.status} · {lead.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === lead.id}
                      className={appBtnSecondary}
                      onClick={() => patchLead(lead.id, "APPROVED")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === lead.id}
                      className={appBtnSecondary}
                      onClick={() => patchLead(lead.id, "ARCHIVED")}
                    >
                      Archive
                    </button>
                  </div>
                </div>
                {lead.insightSummary ? (
                  <p className="type-body-sm mt-3 text-[var(--color-muted)]">{lead.insightSummary}</p>
                ) : null}
                {lead.messageSubject ? (
                  <p className="type-body-sm mt-2 font-medium text-[var(--color-ink)]">Subject: {lead.messageSubject}</p>
                ) : null}
                {lead.messageBody ? (
                  <pre className="type-body-sm mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--color-surface-beige)] p-3 text-[var(--color-muted)]">
                    {lead.messageBody}
                  </pre>
                ) : null}
                <label className="type-caption mt-3 flex flex-col gap-1 text-[var(--color-muted-medium)]">
                  Recipient email (required to approve for automated send)
                  <input
                    type="email"
                    className="rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm text-[var(--color-ink)]"
                    placeholder="owner@example.com"
                    value={recipientById[lead.id] ?? ""}
                    onChange={(e) =>
                      setRecipientById((prev) => ({
                        ...prev,
                        [lead.id]: e.target.value,
                      }))
                    }
                  />
                </label>
                {lead.suggestedTone ? (
                  <p className="type-caption mt-2 text-[var(--color-muted-medium)]">Tone: {lead.suggestedTone}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
