"use client";

import { useCallback, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/kob/utils";

export type SlideCommitStatus = "idle" | "processing" | "success" | "failure";

export function SlideCommit({
  label = "Slide to confirm",
  successLabel = "Done",
  failureLabel = "Could not finish",
  onCommit,
  className,
}: {
  label?: string;
  successLabel?: string;
  failureLabel?: string;
  /** Return true for success. Demo should not imply real supplier writes. */
  onCommit: () => Promise<boolean> | boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<SlideCommitStatus>("idle");
  const maxX = useRef(200);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    maxX.current = Math.max(80, track.clientWidth - 48);
  }, []);

  const finish = useCallback(
    async (reached: boolean) => {
      setDragging(false);
      if (!reached || status !== "idle") {
        setX(0);
        return;
      }
      setStatus("processing");
      setX(maxX.current);
      try {
        const ok = await onCommit();
        setStatus(ok ? "success" : "failure");
      } catch {
        setStatus("failure");
      }
    },
    [onCommit, status],
  );

  if (status === "success") {
    return (
      <div
        className={cn(
          "flex h-12 items-center justify-center gap-2 rounded-full bg-sage text-sm font-medium text-paper",
          className,
        )}
      >
        <Check className="size-4" strokeWidth={2.5} />
        {successLabel}
      </div>
    );
  }

  if (status === "failure") {
    return (
      <button
        type="button"
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-700/90 text-sm font-medium text-paper",
          className,
        )}
        onClick={() => {
          setStatus("idle");
          setX(0);
        }}
      >
        <X className="size-4" />
        {failureLabel} — try again
      </button>
    );
  }

  if (status === "processing") {
    return (
      <div
        className={cn(
          "flex h-12 items-center justify-center gap-2 rounded-full bg-espresso text-sm font-medium text-paper",
          className,
        )}
      >
        <Loader2 className={cn("size-4", !reduce && "animate-spin")} />
        Working…
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-12 touch-none overflow-hidden rounded-full bg-espresso/90 select-none",
        className,
      )}
      onPointerDown={(e) => {
        measure();
        setDragging(true);
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const next = Math.min(maxX.current, Math.max(0, e.clientX - rect.left - 24));
        setX(next);
      }}
      onPointerUp={() => {
        const reached = x >= maxX.current * 0.88;
        void finish(reached);
      }}
      onPointerCancel={() => {
        setDragging(false);
        setX(0);
      }}
    >
      <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-paper/80">
        {label}
      </p>
      <motion.div
        className="absolute top-1 left-1 flex size-10 items-center justify-center rounded-full bg-paper text-espresso shadow-sm"
        style={{ x }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
      >
        <span className="text-lg leading-none">›</span>
      </motion.div>
    </div>
  );
}
