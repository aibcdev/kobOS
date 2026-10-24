import { describe, expect, it, vi } from "vitest";
import { safeNextPath } from "./auth-next-cookie";

describe("safeNextPath", () => {
  it("keeps same-origin paths with their query", () => {
    expect(safeNextPath("/onboard?resume=1")).toBe("/onboard?resume=1");
    expect(safeNextPath("/app/actions/abc?r=r1")).toBe("/app/actions/abc?r=r1");
  });
  it("never leaves the site", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com", "javascript:alert(1)", "/ok\nSet-Cookie: x", ""]) expect(safeNextPath(bad)).toBe("/app");
  });
});

const redirect = vi.hoisted(() => vi.fn((to: string) => {
  throw new Error(`REDIRECT ${to}`);
}));
vi.mock("next/navigation", () => ({ permanentRedirect: redirect }));
vi.mock("@/components/marketing/saas/SaasAuthPage", () => ({ SaasAuthPage: (p: { defaultMode: string }) => ({ type: "SaasAuthPage", props: p }) }));

describe("/signup", () => {
  it("keeps next (and resume=1) by showing sign-up on the same URL; no next goes to onboarding", async () => {
    const { default: Signup } = await import("@/app/(marketing)/signup/page");
    const page = await Signup({ searchParams: Promise.resolve({ next: "/onboard?resume=1" }) });
    expect(page).toMatchObject({ props: { defaultMode: "signup" } });
    expect(redirect).not.toHaveBeenCalled();
    await expect(Signup({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT /onboard");
  });
});
