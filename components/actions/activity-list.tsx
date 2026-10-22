"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionStatus } from "@/components/kob-talk/cards/approval-card";
import type { ActionView } from "@/lib/agent/access";
import { actionsApi } from "@/lib/agent/action-client";

export type ActivityItem = { action: ActionView; connector: string | null; lastEvent: string; at: string };

function UndoButton({ action, onDone }: { action: ActionView; onDone: (inverse: ActionView) => void }) {
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
          const res = await actionsApi.undo(action.id);
          setBusy(false);
          if (res.ok && res.action) onDone(res.action);
          else setError(res.error ?? "Couldn't undo");
        }}
      >
        Undo
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </span>
  );
}

export function ActivityList({ items, timezone, restaurantQuery }: { items: ActivityItem[]; timezone: string; restaurantQuery: string }) {
  const [undone, setUndone] = useState<Record<string, ActionView>>({});
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" });
  if (!items.length) return <p className="rounded-3xl border border-line bg-paper p-6 text-sm text-muted">No activity yet.</p>;

  return (
    <ul className="divide-y divide-line rounded-3xl border border-line bg-paper">
      {items.map(({ action, connector, at }) => {
        const canUndo = !undone[action.id] && action.undoable;
        return (
          <li key={action.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link href={`/app/actions/${action.id}${restaurantQuery}`} className="font-medium hover:underline">
                {action.title}
              </Link>
              <p className="text-xs text-muted">
                {connector ?? "KOB"} · {fmt.format(new Date(at))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ActionStatus view={action} />
              {canUndo ? <UndoButton action={action} onDone={(inverse) => setUndone((u) => ({ ...u, [action.id]: inverse }))} /> : null}
              {undone[action.id] ? <ActionStatus view={undone[action.id]} /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
