"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/kob/utils";
import type { OrbMode } from "@/lib/kob/store";

type Size = "sm" | "md" | "hero";

const box: Record<Size, string> = {
  sm: "size-7",
  md: "size-16",
  hero: "size-32 sm:size-[9.6rem]",
};

export function GreenOrb({
  className,
  size = "hero",
  working = false,
  mode = "idle",
  tightness = 0.5,
  soft = false,
}: {
  className?: string
  size?: Size
  working?: boolean
  mode?: OrbMode
  tightness?: number
  soft?: boolean
}) {
  const root = useRef<HTMLSpanElement>(null);
  const target = useRef({ x: 0.18, y: 0.22 });
  const now = useRef({ x: 0.18, y: 0.22 });
  const resolved: OrbMode = working ? "thinking" : mode;

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const node = el;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    const speed = 0.01 + tightness * 0.02;

    function onMove(event: PointerEvent) {
      const box = node.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      target.current = {
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      };
    }

    function onLeave() {
      target.current = { x: 0.28, y: 0.22 };
    }

    function tick() {
      t += speed;
      const idleX = 0.5 + Math.sin(t) * 0.22;
      const idleY = 0.38 + Math.cos(t * 0.7) * 0.12;
      const aimX = target.current.x * 0.55 + idleX * 0.45;
      const aimY = target.current.y * 0.55 + idleY * 0.45;
      now.current.x += (aimX - now.current.x) * 0.08;
      now.current.y += (aimY - now.current.y) * 0.08;
      node.style.setProperty("--hx", `${now.current.x * 100}%`);
      node.style.setProperty("--hy", `${now.current.y * 100}%`);
      const rx = (0.5 - now.current.y) * 14;
      const ry = (now.current.x - 0.5) * 16;
      node.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      node.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      raf = window.requestAnimationFrame(tick);
    }

    if (!reduced) {
      window.addEventListener("pointermove", onMove);
      node.addEventListener("pointerleave", onLeave);
      raf = window.requestAnimationFrame(tick);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [tightness]);

  return (
    <span
      ref={root}
      className={cn(
        "green-orb",
        `green-orb-${resolved}`,
        soft && "green-orb-soft",
        tightness > 0.7 && "green-orb-tight",
        box[size],
        className,
      )}
      aria-hidden="true"
    >
      <span className="green-orb-sphere">
        <span className="green-orb-fill" />
        <span className="green-orb-band" />
        <span className="green-orb-spec" />
        <span className="green-orb-rim" />
      </span>
    </span>
  );
}
