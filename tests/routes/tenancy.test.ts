import { describe, it, vi } from "vitest";
import { expectForbiddenForOtherTenant } from "@/tests/helpers/tenancy";

vi.mock("@/lib/supabase/server", async () => (await import("@/tests/helpers/tenancy")).supabaseAsTenant());
vi.mock("@/lib/auth/ensure-user", async () => (await import("@/tests/helpers/tenancy")).ensureUserNoop());
vi.mock("@/lib/db/prisma", async () => (await import("@/tests/helpers/tenancy")).prismaForTenant());
vi.mock("@/lib/preview/ui-preview", () => ({
  isUiPreviewEnabled: () => false,
  isPreviewRestaurantId: () => false,
  PREVIEW_USER_ID: "preview",
}));

function json(body: unknown, url = "http://localhost/api/x") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "task-1" }) };

describe("owner routes refuse another restaurant's id", () => {
  it("chief-of-staff today", async () => {
    const { GET } = await import("@/app/api/chief-of-staff/today/route");
    await expectForbiddenForOtherTenant((r) =>
      GET(new Request(`http://localhost/api/chief-of-staff/today?restaurantId=${r}`)),
    );
  });

  it("chief-of-staff approve", async () => {
    const { POST } = await import("@/app/api/chief-of-staff/tasks/[id]/approve/route");
    await expectForbiddenForOtherTenant((r) => POST(json({ restaurantId: r }), params));
  });

  it("chief-of-staff dismiss", async () => {
    const { POST } = await import("@/app/api/chief-of-staff/tasks/[id]/dismiss/route");
    await expectForbiddenForOtherTenant((r) => POST(json({ restaurantId: r }), params));
  });

  it("talk message", async () => {
    const { POST } = await import("@/app/api/talk/message/route");
    await expectForbiddenForOtherTenant((r) =>
      POST(
        json(
          { restaurantId: r, conversationId: "c1", requestId: crypto.randomUUID(), text: "hi" },
          "http://localhost/api/talk/message",
        ),
      ),
    );
  });
});
