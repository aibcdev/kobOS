import { existsSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}));
vi.mock("@/lib/preview/ui-preview", () => ({
  isUiPreviewEnabled: () => false,
  PREVIEW_USER_ID: "preview",
}));

const engines = vi.hoisted(() => ({
  parseInvoiceData: vi.fn(),
  reviewVelocityData: vi.fn(),
  weatherPrepData: vi.fn(),
}));
vi.mock("@/lib/kob/engines/server-logic", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...engines,
}));

const root = path.resolve(__dirname, "../../../..");

function post(body: unknown) {
  return new Request("http://localhost/api/kob/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/kob/* without a session", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["invoice", () => import("@/app/api/kob/invoice/route")],
    ["reviews", () => import("@/app/api/kob/reviews/route")],
    ["weather", () => import("@/app/api/kob/weather/route")],
  ])("%s returns 401 and never reaches the paid engine", async (_name, load) => {
    const { POST } = await load();
    const res = await POST(post({ city: "London" }));
    expect(res.status).toBe(401);
    expect(engines.parseInvoiceData).not.toHaveBeenCalled();
    expect(engines.reviewVelocityData).not.toHaveBeenCalled();
    expect(engines.weatherPrepData).not.toHaveBeenCalled();
  });

  it("legacy talk and os endpoints and the xAI talk brain are gone", () => {
    for (const file of ["app/api/kob/talk/route.ts", "app/api/kob/os/route.ts", "lib/kob/ai/talk-logic.ts"]) {
      expect(existsSync(path.join(root, file)), file).toBe(false);
    }
  });
});
