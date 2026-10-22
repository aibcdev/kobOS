"use client";

import { useState } from "react";

export type GrantRow = {
  id: string;
  label: string;
  scope: "TASK" | "ALWAYS";
  limits: string[];
  /** Preformatted in the restaurant's timezone. */
  grantedAt: string;
  expiresAt: string | null;
};

function RevokeButton({ id, onRevoked }: { id: string; onRevoked: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        className="rounded-full border border-line px-3 py-1 text-xs"
        onClick={async () => {
          setBusy(true);
          const res = await fetch(`/api/permissions/${id}/revoke`, { method: "POST" });
          setBusy(false);
          if (res.ok) onRevoked();
          else setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't revoke");
        }}
      >
        Revoke
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </span>
  );
}

export function GrantList({ grants, empty }: { grants: GrantRow[]; empty: string }) {
  const [revoked, setRevoked] = useState<Set<string>>(new Set());
  if (!grants.length) return <p className="rounded-3xl border border-line bg-paper p-6 text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line rounded-3xl border border-line bg-paper">
      {grants.map((g) => (
        <li key={g.id} data-testid="grant-row" className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium">{g.label}</p>
            <p className="text-xs text-muted">
              {g.scope === "ALWAYS" ? "Always" : `For this task until ${g.expiresAt}`} · since {g.grantedAt}
            </p>
            {g.limits.length ? <p className="text-xs text-muted">{g.limits.join(" · ")}</p> : null}
          </div>
          {revoked.has(g.id) ? (
            <span className="text-xs text-muted">Revoked — KOB will ask first</span>
          ) : (
            <RevokeButton id={g.id} onRevoked={() => setRevoked((s) => new Set(s).add(g.id))} />
          )}
        </li>
      ))}
    </ul>
  );
}
