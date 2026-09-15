"use client";

import { Check } from "lucide-react";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { Button } from "@/components/kob-ui/button";
import { cn } from "@/lib/kob/utils";
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
    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <article
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[0.95rem] leading-relaxed",
          mine
            ? "rounded-br-md bg-[#d9fdd3] text-ink"
            : done
              ? "rounded-bl-md bg-sage-soft text-ink"
              : "rounded-bl-md bg-paper text-ink shadow-card",
        )}
      >
        {done ? (
          <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-sage">
            <Check className="size-3" strokeWidth={2.5} />
            Done
          </span>
        ) : null}
        <p className="whitespace-pre-wrap">{message.text}</p>
        {message.actions && !approved ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
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
      </article>
    </div>
  );
}

export function WaWorking({ mode }: { mode: OrbMode }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <GreenOrb size="sm" mode={mode} />
      <p className="text-sm text-muted">On it…</p>
    </div>
  );
}
