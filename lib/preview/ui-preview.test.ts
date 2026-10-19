import { afterEach, describe, expect, it, vi } from "vitest";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

describe("isUiPreviewEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is on in development when the flag is set", () => {
    vi.stubEnv("NEXT_PUBLIC_UI_PREVIEW", "1");
    vi.stubEnv("NODE_ENV", "development");
    expect(isUiPreviewEnabled()).toBe(true);
  });

  it("can never be enabled on Netlify production", () => {
    vi.stubEnv("NEXT_PUBLIC_UI_PREVIEW", "1");
    vi.stubEnv("CONTEXT", "production");
    vi.stubEnv("ALLOW_UI_PREVIEW_IN_PROD", "1");
    expect(isUiPreviewEnabled()).toBe(false);
  });

  it("is off in production builds unless explicitly allowed", () => {
    vi.stubEnv("NEXT_PUBLIC_UI_PREVIEW", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(isUiPreviewEnabled()).toBe(false);
    vi.stubEnv("ALLOW_UI_PREVIEW_IN_PROD", "1");
    expect(isUiPreviewEnabled()).toBe(true);
  });

  it("is off when the flag is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_UI_PREVIEW", "");
    expect(isUiPreviewEnabled()).toBe(false);
  });
});
