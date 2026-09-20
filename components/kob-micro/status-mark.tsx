"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Loader2, Minus } from "lucide-react";
import { cn } from "@/lib/kob/utils";

export type StatusMarkState =
  | "idle"
  | "running"
  | "executed"
  | "verifying"
  | "verified"
  | "failed"
  | "warning";

const LABELS: Partial<Record<StatusMarkState, string>> = {
  idle: "",
  running: "Working",
  executed: "Sent — waiting",
  verifying: "Verifying",
  verified: "Verified",
  failed: "Needs reconnect",
  warning: "Needs you",
};

export function StatusMark({
  state,
  className,
  showLabel = false,
}: {
  state: StatusMarkState;
  className?: string;
  showLabel?: boolean;
}) {
  const reduce = useReducedMotion();

  const icon =
    state === "verified" ? (
      <Check className="size-3.5" strokeWidth={2.5} />
    ) : state === "failed" ? (
      <AlertTriangle className="size-3.5" strokeWidth={2} />
    ) : state === "warning" ? (
      <span className="text-xs font-bold leading-none">!</span>
    ) : state === "running" || state === "verifying" || state === "executed" ? (
      <Loader2 className={cn("size-3.5", !reduce && "animate-spin")} strokeWidth={2} />
    ) : (
      <Minus className="size-3" strokeWidth={2} />
    );

  const tone =
    state === "verified"
      ? "bg-sage text-paper"
      : state === "failed"
        ? "bg-red-700 text-paper"
        : state === "warning"
          ? "bg-amber text-paper"
          : state === "idle"
            ? "bg-line text-muted"
            : "bg-espresso/10 text-espresso";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <motion.span
        key={state}
        initial={reduce ? false : { scale: 0.7, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
          tone,
        )}
        aria-label={LABELS[state] || state}
      >
        {icon}
      </motion.span>
      {showLabel && LABELS[state] ? (
        <span className="text-xs font-medium text-muted">{LABELS[state]}</span>
      ) : null}
    </span>
  );
}
