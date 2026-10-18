import { beforeEach, describe, expect, it, vi } from "vitest";

const created: Record<string, unknown>[] = [];

vi.mock("@/lib/auth/api-session", () => ({
  requireApiUser: async () => ({ ok: true, userId: "user_1" }),
}));

vi.mock("@/lib/restaurant/hydrate-from-audit", () => ({
  linkAuditToRestaurant: async () => {},
  linkLatestAuditForEmail: async () => {},
}));

vi.mock("@/lib/db/prisma", () => {
  const tx = {
    restaurant: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: "r_1", ...data };
      },
    },
    teamMember: { create: async () => ({}) },
  };
  return {
    prisma: {
      $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
      user: { findUnique: async () => null },
    },
  };
});

import { POST } from "./route";

function post(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return POST(
    new Request("https://trykob.com/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/restaurants timezone + locale", () => {
  beforeEach(() => {
    created.length = 0;
  });

  it("puts a GB restaurant (from CDN geo) on Europe/London even with a US browser zone", async () => {
    const res = await post({ name: "The Crown", timezone: "America/New_York" }, { "x-country": "GB" });
    expect(res.status).toBe(201);
    expect(created[0]).toMatchObject({ timezone: "Europe/London", countryCode: "GB", locale: "en-GB" });
  });

  it("trusts the kob_region=GB cookie when there is no geo header", async () => {
    await post({ name: "Pie Shop" }, { cookie: "kob_region=GB" });
    expect(created[0]).toMatchObject({ timezone: "Europe/London", countryCode: "GB" });
  });

  it("uses Places country + state for US restaurants", async () => {
    await post({ name: "Taqueria", countryCode: "US", state: "TX", timezone: "Europe/London" });
    expect(created[0]).toMatchObject({ timezone: "America/Chicago", countryCode: "US", locale: "en-US" });
  });

  it("leaves the column default when nothing is known", async () => {
    await post({ name: "Mystery Diner" });
    expect(created[0]).toMatchObject({ timezone: undefined, countryCode: null, locale: "en-GB" });
  });
});
