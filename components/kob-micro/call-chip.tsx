"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/kob/utils";
import { StatusMark, type StatusMarkState } from "./status-mark";

export type CallChipState = "idle" | "running" | "done" | "error" | "warning";

function toMark(state: CallChipState): StatusMarkState {
  if (state === "done") return "verified";
  if (state === "error") return "failed";
  if (state === "warning") return "warning";
  if (state === "running") return "running";
  return "idle";
}

export function CallChip({
  label,
  state = "idle",
  className,
}: {
  label: string;
  state?: CallChipState;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      layout={!reduce}
      className={cn(
        "inline-flex max-w-full items-center gap-2.5 rounded-full border border-line bg-paper px-3 py-2 text-sm text-ink shadow-sm",
        state === "running" && "border-espresso/20",
        state === "done" && "border-sage/30",
        state === "warning" && "border-amber/40",
        state === "error" && "border-red-700/30",
        className,
      )}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <StatusMark state={toMark(state)} />
      <span className="min-w-0 truncate font-medium">{label}</span>
    </motion.div>
  );
}
