import { authorised, type PermissionMode, type Role } from "@/lib/os/permissions";
import { actionRisk } from "@/lib/os/risk";
import { ownerFacingStatus } from "@/lib/os/gates";
import type { IntegrationAdapter } from "@/lib/os/adapter";
import { hoursEqual, type HoursState } from "@/lib/os/adapters/hours-memory";

export type HoursSyncInput = {
  google: HoursState;
  website: HoursState;
  canonical: "website" | "google";
  permissionMode: PermissionMode;
  role: Role;
  reliability: number;
  approved?: boolean;
  adapters: { google: IntegrationAdapter; website: IntegrationAdapter };
};

export type ChannelResult = {
  channel: string;
  status: string;
  ownerStatus: string;
  reason?: string;
};

export async function syncHoursEverywhere(input: HoursSyncInput): Promise<{
  canonical: HoursState;
  needsApproval: boolean;
  results: ChannelResult[];
  ownerMessage: string;
}> {
  const canonical = input.canonical === "website" ? input.website : input.google;
  const googleWrong = !hoursEqual(input.google, canonical);
  const websiteWrong = !hoursEqual(input.website, canonical);
  const risk = actionRisk({
    financial: 10,
    customer: 55,
    reversibility: 20,
    reputation: 40,
    operational: 35,
  });
  const auth = authorised({
    mode: input.permissionMode,
    role: input.role,
    risk,
    reliability: input.reliability,
    actionType: "HOURS_UPDATE",
  });
  if (!auth.ok) {
    return {
      canonical,
      needsApproval: true,
      results: [],
      ownerMessage: auth.reason,
    };
  }
  if (auth.requiresApproval && !input.approved) {
    return {
      canonical,
      needsApproval: true,
      results: [],
      ownerMessage: `I found different hours. Canonical is ${canonical.open}–${canonical.close}. Should I correct the others?`,
    };
  }

  const results: ChannelResult[] = [];
  const expected = { ...canonical };

  async function run(channel: string, adapter: IntegrationAdapter, needs: boolean) {
    if (!needs) {
      results.push({
        channel,
        status: "VERIFIED",
        ownerStatus: ownerFacingStatus("VERIFIED"),
      });
      return;
    }
    const exec = await adapter.execute("SET_HOURS", expected);
    if (!exec.ok) {
      results.push({
        channel,
        status: "FAILED",
        ownerStatus: ownerFacingStatus("FAILED"),
        reason: exec.reason,
      });
      return;
    }
    const v = await adapter.verify(expected);
    results.push({
      channel,
      status: v.matchesExpected ? "VERIFIED" : "EXECUTED",
      ownerStatus: ownerFacingStatus(v.matchesExpected ? "VERIFIED" : "EXECUTED"),
      reason: v.reason,
    });
  }

  await run("google", input.adapters.google, googleWrong);
  await run("website", input.adapters.website, websiteWrong);

  const failed = results.filter((r) => r.status === "FAILED");
  const unverified = results.filter((r) => r.status === "EXECUTED");
  const ok = results.filter((r) => r.status === "VERIFIED").map((r) => r.channel);
  let ownerMessage: string;
  if (failed.length && ok.length) {
    ownerMessage = `${ok.join(" and ")} ${ok.length === 1 ? "is" : "are"} updated. I couldn't update ${failed.map((f) => f.channel).join(" and ")} because the connection needs reconnecting.`;
  } else if (failed.length) {
    ownerMessage = failed.map((f) => f.reason ?? f.channel).join(" ");
  } else if (unverified.length) {
    ownerMessage = "Sent — waiting for confirmation.";
  } else {
    ownerMessage = `Hours verified everywhere: ${canonical.open}–${canonical.close}.`;
  }

  return { canonical, needsApproval: false, results, ownerMessage };
}
