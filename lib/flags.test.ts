import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/prisma", () => ({ prisma: { featureFlagOverride: { findUnique } } }));

import { FLAGS, flag } from "@/lib/flags";

describe("flag()", () => {
  beforeEach(() => findUnique.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("defaults every flag to off", async () => {
    for (const name of FLAGS) vi.stubEnv(name, "");
    for (const name of FLAGS) expect(await flag(name)).toBe(false);
  });

  it("returns the env default when there is no restaurant", async () => {
    vi.stubEnv("GBP_LIVE", "1");
    vi.stubEnv("WHATSAPP_LIVE", "true");
    expect(await flag("GBP_LIVE")).toBe(true);
    expect(await flag("WHATSAPP_LIVE")).toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("lets a per-restaurant override win in both directions", async () => {
    vi.stubEnv("GBP_LIVE", "0");
    findUnique.mockResolvedValueOnce({ enabled: true });
    expect(await flag("GBP_LIVE", "r1")).toBe(true);

    vi.stubEnv("GBP_LIVE", "1");
    findUnique.mockResolvedValueOnce({ enabled: false });
    expect(await flag("GBP_LIVE", "r1")).toBe(false);
    expect(findUnique).toHaveBeenLastCalledWith({
      where: { restaurantId_name: { restaurantId: "r1", name: "GBP_LIVE" } },
      select: { enabled: true },
    });
  });

  it("falls back to the env default when there is no override or the lookup fails", async () => {
    vi.stubEnv("PROACTIVE_ENABLED", "1");
    findUnique.mockResolvedValueOnce(null);
    expect(await flag("PROACTIVE_ENABLED", "r1")).toBe(true);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    findUnique.mockRejectedValueOnce(new Error("db down"));
    expect(await flag("PROACTIVE_ENABLED", "r1")).toBe(true);
  });
});
