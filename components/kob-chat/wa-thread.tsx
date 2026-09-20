"use client";

import { Check } from "lucide-react";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { Button } from "@/components/kob-ui/button";
import { ThoughtLine } from "@/components/kob-micro";
import type { ChatMessage } from "@/lib/kob/demo";
import type { OrbMode } from "@/lib/kob/store";

export function WaBubble({
  message,
  onAction,
  approved,
}: {
  message: ChatMessage
  onAction?: (messageId: string, actionId: string) => void
  approved?: boolean
}) {
  const mine = message.role === "owner";
  const done = message.role === "done";

  return (
    <article className="relative z-[1] flex w-full items-start gap-3 rounded-2xl bg-paper px-4 py-3.5 shadow-card">
      {done ? (
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sage text-paper">
          <Check className="size-3.5" strokeWidth={2.5} />
        </span>
      ) : mine ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/photos/owner-face.jpg"
          alt=""
          className="mt-0.5 size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center">
          <GreenOrb size="sm" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {done ? null : mine ? null : message.actions?.length ? (
          <p className="mb-1 text-xs font-semibold text-[#d85a3a]">KOB · Talk</p>
        ) : null}
        <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">{message.text}</p>
        {message.actions && !approved ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.kind === "ignore" ? "outline" : "primary"}
                onClick={() => onAction?.(message.id, action.id)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function WaWorking({ mode }: { mode: OrbMode }) {
  return (
    <div className="relative z-[1] space-y-2">
      <ThoughtLine
        title="KOB is checking…"
        steps={[
          { id: "1", label: "Comparing supplier invoices", state: "running" },
          { id: "2", label: "Comparing item sales", state: "idle" },
          { id: "3", label: "Checking prep signals", state: "idle" },
        ]}
      />
      <article className="flex w-full items-center gap-3 rounded-2xl bg-paper px-4 py-3.5 shadow-card">
        <GreenOrb size="sm" mode={mode} />
        <p className="text-sm text-muted">On it…</p>
      </article>
    </div>
  );
}
