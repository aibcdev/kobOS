/** Lazy sharp load — never crash the audit if the binary is missing/wrong OS. */
import type sharp from "sharp";

export type SharpLike = typeof sharp;

let sharpPromise: Promise<SharpLike | null> | null = null;

export function loadSharp(): Promise<SharpLike | null> {
  if (!sharpPromise) {
    sharpPromise = (async () => {
      try {
        const mod = await import("sharp");
        return mod.default;
      } catch (err) {
        console.warn("[sharp-safe] sharp unavailable:", err instanceof Error ? err.message : err);
        return null;
      }
    })();
  }
  return sharpPromise;
}
