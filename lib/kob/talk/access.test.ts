import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
  }),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { teamMember: { findUnique: mocks.findUnique } },
}));
import { sameOrigin, talkAccess } from "./access";
beforeEach(() => vi.resetAllMocks());
it("requires a real authenticated user even if preview is enabled", async () => {
  vi.stubEnv("NEXT_PUBLIC_UI_PREVIEW", "1");
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect(await talkAccess("restaurant")).toMatchObject({
    ok: false,
    status: 401,
  });
  expect(mocks.findUnique).not.toHaveBeenCalled();
});
it("rejects another restaurant's connections", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-a" } } });
  mocks.findUnique.mockResolvedValue(null);
  expect(await talkAccess("restaurant-b")).toMatchObject({
    ok: false,
    status: 403,
  });
  expect(mocks.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        userId_restaurantId: {
          userId: "owner-a",
          restaurantId: "restaurant-b",
        },
      },
    }),
  );
});
it("rejects cross-origin mutations", () => {
  expect(
    sameOrigin(
      new Request("https://trykob.com/api/talk/message", {
        headers: { origin: "https://attacker.example" },
      }),
    ),
  ).toBe(false);
  expect(
    sameOrigin(
      new Request("https://trykob.com/api/talk/message", {
        headers: { origin: "https://trykob.com" },
      }),
    ),
  ).toBe(true);
});
