import { describe, expect, it } from "vitest";
import { ACTION_TYPES } from "@/lib/agent/action-types";
import { FLAGS } from "@/lib/flags";
import { allManifests, DATA_CONTRACTS, getManifest, manifestsFor } from "@/lib/hub/manifest";
import { getOAuthConfig } from "@/lib/integrations/oauth-config";

describe("connector manifests", () => {
  it.each(allManifests().map((m) => [m.provider, m] as const))("%s is well-formed", (_p, m) => {
    expect(FLAGS as readonly string[]).toContain(m.approval.flag);
    for (const a of m.actions) expect(ACTION_TYPES as readonly string[]).toContain(a);
    for (const c of m.dataContracts) expect(DATA_CONTRACTS as readonly string[]).toContain(c);
    expect(new Set(m.streams.map((s) => s.name)).size).toBe(m.streams.length);
    for (const s of m.streams) expect(s.schedule.split(" ")).toHaveLength(5);
    if (m.auth.kind.startsWith("OAUTH2")) expect(m.auth.tokenUrl).toMatch(/^https:\/\//);
    if (m.auth.kind === "API_KEY" || m.auth.kind === "BASIC_KEY_SECRET") expect(m.auth.keyFields?.length).toBeGreaterThan(0);
  });

  it("Square OAuth config comes from its manifest", () => {
    const m = getManifest("SQUARE")!;
    expect(getOAuthConfig("SQUARE")).toMatchObject({ scopes: m.auth.scopes, tokenUrl: m.auth.tokenUrl, clientIdEnv: "SQUARE_APPLICATION_ID" });
  });

  it("finds suppliers of a contract by region", () => {
    expect(manifestsFor("sales", "GB").map((m) => m.provider)).toContain("SQUARE");
    expect(manifestsFor("sales", "NZ").map((m) => m.provider)).not.toContain("SQUARE");
  });
});
