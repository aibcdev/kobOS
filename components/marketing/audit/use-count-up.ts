"use client";

import { useEffect, useState } from "react";

/** Animate integer score for scanning sidebar teaser. */
export function useCountUp(target: number | null, durationMs = 700) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target == null || target <= 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    const from = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
