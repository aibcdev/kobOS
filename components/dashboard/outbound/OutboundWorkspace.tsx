"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { appBtnPrimary, appBtnSecondary, appCardSurface } from "@/lib/app-ui-classes";

type LeadRow = {
  id: string;
  city: string | null;
  restaurantName: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  insightSummary: string | null;
  messageSubject: string | null;
  messageBody: string | null;
  suggestedTone: string | null;
  status: string;
  source: string;
  qualifyScore: number | null;
  reviewCount: number | null;
  enrichmentSource: string | null;
  createdAt: string;
};

type PipelineProps = {
  ukColdQueue: LeadRow[];
  auditQueue: LeadRow[];
  approved: LeadRow[];
  sent: LeadRow[];
  restaurantId: string;
  salesMode: boolean;
  ukColdMode: boolean;
  defaultCity?: string;
};

function LeadCard({
  lead,
  restaurantId,
  busyId,
  setBusyId,
  recipientById,
  setRecipientById,
  showApprove,
}: {
  lead: LeadRow;
  restaurantId: string;
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  recipientById: Record<string, string>;
  setRecipientById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showApprove: boolean;
}) {
  const router = useRouter();

  async function patchLead(id: string, status: "APPROVED" | "ARCHIVED") {
    setBusyId(id);
    const email = recipientById[id]?.trim() || lead.contactEmail?.trim();
    if (status === "APPROVED" && !email) {
      alert("Add a recipient email before approving.");
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
    <li className={appCardSurface}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="type-label-md text-[var(--color-ink)]">{lead.restaurantName ?? "Unknown venue"}</p>
          <p className="type-caption text-[var(--color-muted-medium)]">
            {lead.city ?? "—"} · {lead.status}
            {lead.qualifyScore != null ? ` · score ${lead.qualifyScore}` : ""}
            {lead.reviewCount != null ? ` · ${lead.reviewCount} reviews` : ""}
            {lead.enrichmentSource ? ` · email via ${lead.enrichmentSource}` : ""}
          </p>
        </div>
        {showApprove ? (
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
        ) : null}
      </div>
      {lead.contactEmail ? (
        <p className="type-caption mt-2 text-[var(--color-muted)]">To: {lead.contactEmail}</p>
      ) : null}
      {lead.insightSummary ? <p className="type-body-sm mt-3 text-[var(--color-muted)]">{lead.insightSummary}</p> : null}
      {lead.messageSubject ? (
        <p className="type-body-sm mt-2 font-medium text-[var(--color-ink)]">Subject: {lead.messageSubject}</p>
      ) : null}
      {lead.messageBody ? (
        <pre className="type-body-sm mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--color-surface-beige)] p-3 text-[var(--color-muted)]">
          {lead.messageBody}
        </pre>
      ) : null}
      {showApprove && !lead.contactEmail ? (
        <label className="type-caption mt-3 flex flex-col gap-1 text-[var(--color-muted-medium)]">
          Recipient email
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
      ) : null}
    </li>
  );
}

export function OutboundWorkspace({
  ukColdQueue,
  auditQueue,
  approved,
  sent,
  restaurantId,
  salesMode,
  ukColdMode,
  defaultCity = "",
}: PipelineProps) {
  const router = useRouter();
  const [city, setCity] = useState(defaultCity);
  const [max, setMax] = useState(10);
  const [drafting, setDrafting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [runningDaily, setRunningDaily] = useState(false);
  const [batchApproving, setBatchApproving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recipientById, setRecipientById] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"uk_cold" | "audit" | "approved" | "sent">(ukColdMode ? "uk_cold" : "audit");

  const activeQueue = tab === "uk_cold" ? ukColdQueue : tab === "audit" ? auditQueue : [];

  useEffect(() => {
    setRecipientById(
      Object.fromEntries([...ukColdQueue, ...auditQueue].map((l) => [l.id, l.contactEmail ?? ""])),
    );
  }, [ukColdQueue, auditQueue]);

  async function approveBatch(source: "UK_COLD" | "AUDIT") {
    setBatchApproving(true);
    setDraftError(null);
    try {
      const res = await fetch("/api/outbound/approve-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, source }),
      });
      const data = (await res.json()) as { approved?: number; skipped?: number; error?: string };
      if (!res.ok) {
        setDraftError(data.error ?? "Batch approve failed");
        return;
      }
      setStatusMsg(`Approved ${data.approved ?? 0} (${data.skipped ?? 0} skipped — missing email).`);
      router.refresh();
    } catch {
      setDraftError("Network error");
    }
    setBatchApproving(false);
  }

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
          res.status === 402 ? "Pro plan required (or OUTBOUND_SALES_MODE=1)." : (data.error ?? "Request failed"),
        );
        return;
      }
      setStatusMsg(`Added ${data.inserted ?? 0} legacy draft(s).`);
      router.refresh();
    } catch {
      setDraftError("Network error");
    }
    setDrafting(false);
  }

  async function importAudits() {
    setImporting(true);
    try {
      const res = await fetch("/api/outbound/import-audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, max: 25, daysBack: 30 }),
      });
      const data = (await res.json()) as { inserted?: number; skipped?: number; error?: string };
      if (!res.ok) {
        setDraftError(data.error ?? "Import failed");
        return;
      }
      setStatusMsg(`Imported ${data.inserted ?? 0} audit lead(s).`);
      router.refresh();
    } catch {
      setDraftError("Network error");
    }
    setImporting(false);
  }

  async function runDaily(step: "draft" | "send" | "both") {
    setRunningDaily(true);
    try {
      const res = await fetch("/api/outbound/run-daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, step }),
      });
      const data = (await res.json()) as { enqueued?: string[]; error?: string };
      if (!res.ok) {
        setDraftError(data.error ?? "Could not enqueue");
        return;
      }
      setStatusMsg(`Queued: ${(data.enqueued ?? []).join(", ")}`);
    } catch {
      setDraftError("Network error");
    }
    setRunningDaily(false);
  }

  const tabLeads = tab === "approved" ? approved : tab === "sent" ? sent : activeQueue;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-[var(--spacing-md)] py-10">
      <div>
        <h1 className="type-title-md">Sales pipeline</h1>
        <p className="type-body-md mt-2 text-[var(--color-muted)]">
          {ukColdMode
            ? "UK cold outreach: independent restaurants, weak online visibility, emails from Hunter. Approve a batch daily, then sends run automatically."
            : "Outbound email with human approval before send."}
          {salesMode ? " Sales mode on." : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 type-caption">
          <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1">UK cold: {ukColdQueue.length}</span>
          <span className="rounded-full bg-[var(--color-muted-faint)] px-3 py-1">Audit: {auditQueue.length}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">Approved: {approved.length}</span>
          <span className="rounded-full bg-[var(--color-accent)]/10 px-3 py-1">Sent: {sent.length}</span>
        </div>
      </div>

      <section className={appCardSurface}>
        <h2 className="type-title-sm">Daily actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={appBtnPrimary} disabled={runningDaily} onClick={() => runDaily("both")}>
            {runningDaily ? "Queuing…" : ukColdMode ? "Run UK cold + send" : "Run pipeline"}
          </button>
          <button type="button" className={appBtnSecondary} disabled={runningDaily} onClick={() => runDaily("send")}>
            Send approved only
          </button>
          <button type="button" className={appBtnSecondary} disabled={importing} onClick={importAudits}>
            {importing ? "…" : "Import audit emails"}
          </button>
          {ukColdMode && ukColdQueue.length > 0 ? (
            <button
              type="button"
              className={appBtnSecondary}
              disabled={batchApproving}
              onClick={() => approveBatch("UK_COLD")}
            >
              {batchApproving ? "…" : `Approve UK batch (${ukColdQueue.length})`}
            </button>
          ) : null}
          {auditQueue.length > 0 ? (
            <button
              type="button"
              className={appBtnSecondary}
              disabled={batchApproving}
              onClick={() => approveBatch("AUDIT")}
            >
              {batchApproving ? "…" : `Approve audit batch (${auditQueue.length})`}
            </button>
          ) : null}
        </div>
        {draftError ? <p className="type-body-sm mt-3 text-red-700">{draftError}</p> : null}
        {statusMsg ? <p className="type-body-sm mt-3 text-[var(--color-primary)]">{statusMsg}</p> : null}
      </section>

      {!ukColdMode ? (
        <section className={appCardSurface}>
          <h2 className="type-title-sm">Legacy city scan</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input
              className="flex-1 rounded-[var(--radius-default)] border border-[var(--color-hairline)] px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
            />
            <button type="button" disabled={drafting || !city.trim()} onClick={runDraft} className={appBtnSecondary}>
              Generate
            </button>
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-hairline)] pb-3">
          {(
            [
              ...(ukColdMode ? [["uk_cold", `UK cold (${ukColdQueue.length})`] as const] : []),
              ["audit", `Audit follow-up (${auditQueue.length})`] as const,
              ["approved", `Approved (${approved.length})`] as const,
              ["sent", `Sent (${sent.length})`] as const,
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === key ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tabLeads.length === 0 ? (
          <p className={`${appCardSurface} type-body-sm mt-4 text-[var(--color-muted)]`}>Nothing here yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {tabLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                restaurantId={restaurantId}
                busyId={busyId}
                setBusyId={setBusyId}
                recipientById={recipientById}
                setRecipientById={setRecipientById}
                showApprove={tab === "uk_cold" || tab === "audit"}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
