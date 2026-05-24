import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { analyzeScreenshotBuffer, heuristicFromSharpStats } from "@/lib/audit/visual-intelligence";

describe("visual-intelligence", () => {
  it("heuristicFromSharpStats returns bounded scores", () => {
    const fakeStats = {
      channels: [
        { mean: 120, stdev: 35, min: 0, max: 255 },
        { mean: 90, stdev: 40, min: 0, max: 255 },
        { mean: 70, stdev: 45, min: 0, max: 255 },
      ],
    } as sharp.Stats;
    const h = heuristicFromSharpStats(fakeStats);
    expect(h.overallHeuristic).toBeGreaterThanOrEqual(0);
    expect(h.overallHeuristic).toBeLessThanOrEqual(100);
    expect(h.brisqueApprox).toBeGreaterThanOrEqual(0);
  });

  it("analyzeScreenshotBuffer runs on generated PNG", async () => {
    const buf = await sharp({
      create: {
        width: 24,
        height: 24,
        channels: 3,
        background: { r: 200, g: 110, b: 70 },
      },
    })
      .png()
      .toBuffer();
    const r = await analyzeScreenshotBuffer(buf);
    expect(r.version).toBe(1);
    expect(r.overallHeuristic).toBeGreaterThan(0);
  });
});
