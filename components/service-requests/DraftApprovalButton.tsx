"use client";

import { useState } from "react";

export function DraftApprovalButton({
  requestId,
  draftId,
  approved,
}: {
  requestId: string;
  draftId: string;
  approved: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(approved);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/service-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not approve this draft.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={busy || done}
        onClick={() => void approve()}
        className="rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {done ? "Approved" : busy ? "Approving…" : "Approve this draft"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
