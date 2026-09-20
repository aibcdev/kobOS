"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/kob/utils";

export function SquishSwitch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-sage" : "bg-line-strong",
        className,
      )}
      onClick={() => onChange(!checked)}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 size-6 rounded-full bg-paper shadow-sm"
        animate={{ x: checked ? 20 : 0, scale: reduce ? 1 : checked ? [1, 0.92, 1] : 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      />
    </button>
  );
}

export function WarmTooltip({
  term,
  children,
  className,
}: {
  term: string;
  children: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn("relative inline", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button type="button" className="border-b border-dotted border-muted text-inherit">
        {term}
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-2xl bg-espresso px-3 py-2 text-left text-xs leading-relaxed text-paper shadow-soft"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
