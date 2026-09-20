"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/kob/utils";

export type RubberOption<T extends string = string> = {
  id: T;
  label: string;
};

export function RubberSegment<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly RubberOption<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const idx = options.findIndex((o) => o.id === value);
    const btn = btnRefs.current[idx];
    const track = trackRef.current;
    if (!btn || !track) return;
    const t = track.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    setThumb({ left: b.left - t.left, width: b.width });
  }, [value, options]);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative flex rounded-full border border-line bg-cream p-1",
        className,
      )}
      role="tablist"
      aria-label="Autonomy level"
    >
      <motion.div
        aria-hidden
        className="absolute top-1 bottom-1 rounded-full bg-espresso shadow-sm"
        initial={false}
        animate={{ left: thumb.left, width: thumb.width }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 32, mass: 0.6 }
        }
      />
      {options.map((opt, i) => {
        const on = opt.id === value;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            className={cn(
              "relative z-10 flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              on ? "text-paper" : "text-muted hover:text-espresso",
            )}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
