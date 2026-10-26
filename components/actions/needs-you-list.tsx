"use client";

import { useState } from "react";
import { SwipeRow } from "@/components/kob-micro";
import { PostCard } from "@/components/actions/post-card";
import { ApprovalCard } from "@/components/kob-talk/cards/approval-card";
import type { ActionView } from "@/lib/agent/access";
import { actionsApi } from "@/lib/agent/action-client";

/** Swipe right to approve, left to skip (mobile); the card's buttons do the same everywhere. */
export function NeedsYouList({ actions, restaurantQuery }: { actions: ActionView[]; restaurantQuery: string }) {
  const [items, setItems] = useState(actions);
  const [version, setVersion] = useState<Record<string, number>>({});

  if (!items.length) {
    return <p className="rounded-3xl border border-line bg-paper p-6 text-sm text-muted">Nothing needs you right now.</p>;
  }

  async function quick(view: ActionView, id: string) {
    if (id === "skip") {
      const res = await actionsApi.reject(view.id, "Not now");
      if (res.ok) setItems((all) => all.filter((a) => a.id !== view.id));
      return;
    }
    if (view.requiresSlide) return; // risky ones need the slide on the card
    const res = await actionsApi.approve(view.id, { scope: "ONCE" });
    if (res.action) {
      const next = res.action;
      setItems((all) => all.map((a) => (a.id === view.id ? next : a)));
      setVersion((v) => ({ ...v, [view.id]: (v[view.id] ?? 0) + 1 }));
    }
  }

  return (
    <ul className="space-y-4">
      {items.map((a) => (
        <li key={`${a.id}:${version[a.id] ?? 0}`}>
          <SwipeRow
            fallbackButtons={false}
            actions={
              a.status === "AWAITING_APPROVAL"
                ? [
                    // Assisted items are approved on the card, where the tap also copies the words and opens Google.
                    ...(a.requiresSlide || a.assist ? [] : [{ id: "approve", label: "Approve", tone: "primary" as const }]),
                    { id: "skip", label: "Skip", tone: "muted" as const },
                  ]
                : []
            }
            onAction={(id) => void quick(a, id)}
          >
            {a.assist ? (
              <PostCard
                action={a}
                detailHref={`/app/actions/${a.id}${restaurantQuery}`}
                onSettled={(view) => {
                  if (view.status === "REJECTED") setItems((all) => all.filter((x) => x.id !== view.id));
                  else setItems((all) => all.map((x) => (x.id === view.id ? view : x)));
                }}
              />
            ) : (
              <ApprovalCard
                action={a}
                detailHref={`/app/actions/${a.id}${restaurantQuery}`}
                onSettled={(view) => {
                  if (view.status === "REJECTED") setItems((all) => all.filter((x) => x.id !== view.id));
                  else setItems((all) => all.map((x) => (x.id === view.id ? view : x)));
                }}
              />
            )}
          </SwipeRow>
        </li>
      ))}
    </ul>
  );
}
