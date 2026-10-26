import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/prisma", () => ({ prisma: { featureFlagOverride: { findUnique } } }));

import { isAssisted, isGoogleAction, publishMode } from "@/lib/agent/publish-mode";

const reply = (reviewId: string) => ({ actionType: "gbp.review.reply", proposedPayload: { actionType: "gbp.review.reply", reviewId, replyText: "Thanks!" } });
const hours = (gbpLocationId: string) => ({
  actionType: "gbp.hours.regular.update",
  proposedPayload: { actionType: "gbp.hours.regular.update", gbpLocationId, periods: [] },
});

describe("publishMode()", () => {
  beforeEach(() => findUnique.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("is assisted while GBP_LIVE is off", async () => {
    vi.stubEnv("GBP_LIVE", "");
    findUnique.mockResolvedValue(null);
    expect(await publishMode("r1")).toBe("assisted");
    expect(await publishMode(null)).toBe("assisted");
  });

  it("is auto once GBP_LIVE is on", async () => {
    vi.stubEnv("GBP_LIVE", "1");
    findUnique.mockResolvedValue(null);
    expect(await publishMode("r1")).toBe("auto");
  });

  it("follows a per-restaurant override", async () => {
    vi.stubEnv("GBP_LIVE", "1");
    findUnique.mockResolvedValueOnce({ enabled: false });
    expect(await publishMode("r1")).toBe("assisted");
  });
});

describe("isAssisted()", () => {
  it("only applies to Google actions", () => {
    expect(isGoogleAction("gbp.review.reply")).toBe(true);
    expect(isGoogleAction("guest.reply.send")).toBe(false);
    expect(isAssisted({ actionType: "guest.reply.send", proposedPayload: {} }, "assisted")).toBe(false);
  });

  it("every Google action is assisted in assisted mode", () => {
    expect(isAssisted(reply("accounts/1/locations/2/reviews/3"), "assisted")).toBe(true);
    expect(isAssisted(hours("accounts/1/locations/2"), "assisted")).toBe(true);
  });

  it("auto mode leaves synced reviews and listing fixes to the executor, unchanged", () => {
    expect(isAssisted(reply("accounts/1/locations/2/reviews/3"), "auto")).toBe(false);
    expect(isAssisted(hours("accounts/1/locations/2"), "auto")).toBe(false);
    expect(isAssisted({ actionType: "gbp.review.reply", proposedPayload: null }, "auto")).toBe(false);
  });

  it("auto mode still hands a pasted review (no Google id) to the owner", () => {
    expect(isAssisted(reply("kob-review:abc"), "auto")).toBe(true);
  });
});
