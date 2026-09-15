"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { KobMark } from "@/components/kob-brand/kob-mark";
import { Button } from "@/components/kob-ui/button";
import { cn } from "@/lib/kob/utils";
import type { ChatMessage } from "@/lib/kob/demo";

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1" aria-label="KOB is working">
      <span className="size-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.2s]" />
      <span className="size-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.1s]" />
      <span className="size-1.5 rounded-full bg-muted animate-bounce" />
    </span>
  );
}

export function ChatWell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.75rem] bg-cream p-5 sm:p-8">
      <div className="mx-auto flex max-w-md flex-col items-stretch">{children}</div>
    </div>
  );
}

export function ChatBubble({
  message,
  onAction,
  approved,
  first = false,
}: {
  message: ChatMessage
  onAction?: (messageId: string, actionId: string) => void
  approved?: boolean
  first?: boolean
}) {
  const isDone = message.role === "done";
  const isKob = message.role === "kob" || isDone;

  return (
    <div className="flex flex-col items-center">
      {first ? null : <span className="mb-3 h-6 w-px bg-line-strong" />}
      <article className="w-full rounded-2xl bg-paper px-4 py-4 shadow-card">
        <div className="flex items-start gap-3">
          {isDone ? (
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sage text-paper">
              <Check className="size-3.5" strokeWidth={2.5} />
            </span>
          ) : isKob ? (
            <KobMark size="sm" />
          ) : (
            <OwnerChip />
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">
              {message.text}
            </p>
            {message.actions && !approved ? (
              <div className="flex flex-wrap gap-2">
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
        </div>
      </article>
    </div>
  );
}

function OwnerChip() {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-espresso text-[0.7rem] font-medium tracking-wide text-cream">
      You
    </span>
  );
}

export function KobWorking({ label = "On it" }: { label?: string }) {
  return (
    <div className={cn("flex flex-col items-center")}>
      <span className="mb-3 h-6 w-px bg-line-strong" />
      <article className="flex w-full items-center gap-3 rounded-2xl bg-paper px-4 py-4 shadow-card">
        <KobMark size="sm" working />
        <span className="flex items-center gap-2 text-sm text-muted">
          {label}
          <TypingDots />
        </span>
      </article>
    </div>
  );
}
