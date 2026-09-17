import { authorised, type PermissionMode, type Role } from "@/lib/os/permissions";
import { actionRisk } from "@/lib/os/risk";
import type { IntegrationAdapter } from "@/lib/os/adapter";
import { ownerFacingStatus } from "@/lib/os/gates";

export type VoiceIntent = {
  intent: string;
  locationId?: string;
  entities: Record<string, string>;
  confidence: number;
  requested_channels: string;
};

export function parseTemporaryClosure(utterance: string, now = new Date()): VoiceIntent | null {
  const t = utterance.toLowerCase();
  if (!/(shut|closed|close|we're closed|we are closed)/.test(t)) return null;
  let date = "";
  if (/\bmonday\b/.test(t)) date = nextWeekday(now, 1);
  else if (/\btuesday\b/.test(t)) date = nextWeekday(now, 2);
  else if (/\bwednesday\b/.test(t)) date = nextWeekday(now, 3);
  else if (/\bthursday\b/.test(t)) date = nextWeekday(now, 4);
  else if (/\bfriday\b/.test(t)) date = nextWeekday(now, 5);
  else if (/\bsaturday\b/.test(t)) date = nextWeekday(now, 6);
  else if (/\bsunday\b/.test(t)) date = nextWeekday(now, 0);
  else {
    const m = t.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) date = m[1]!;
  }
  if (!date) return null;
  return {
    intent: "TEMPORARY_CLOSURE",
    entities: { date },
    confidence: 0.97,
    requested_channels: "ALL",
  };
}

function nextWeekday(from: Date, dow: number): string {
  const d = new Date(from);
  const cur = d.getDay();
  let add = (dow - cur + 7) % 7;
  if (add === 0) add = 7;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

export async function applyTemporaryClosure(input: {
  date: string;
  locationCount: number;
  locationId?: string;
  permissionMode: PermissionMode;
  role: Role;
  reliability: number;
  approved?: boolean;
  adapters: Record<string, IntegrationAdapter>;
}): Promise<{ ask: string | null; message: string; statuses: Record<string, string> }> {
  if (input.locationCount > 1 && !input.locationId) {
    return { ask: "Which location?", message: "", statuses: {} };
  }
  const risk = actionRisk({
    financial: 20,
    customer: 70,
    reversibility: 25,
    reputation: 50,
    operational: 40,
  });
  const auth = authorised({
    mode: input.permissionMode,
    role: input.role,
    risk,
    reliability: input.reliability,
    actionType: "TEMPORARY_CLOSURE",
  });
  if (auth.requiresApproval && !input.approved) {
    const channels = Object.keys(input.adapters);
    return {
      ask: `I'll mark ${input.date} closed on ${channels.join(", ").replace(/, ([^,]*)$/, " and $1")}. Apply all?`,
      message: "",
      statuses: {},
    };
  }
  const statuses: Record<string, string> = {};
  const verified: string[] = [];
  const failed: string[] = [];
  for (const [name, adapter] of Object.entries(input.adapters)) {
    const exec = await adapter.execute("TEMPORARY_CLOSURE", { date: input.date });
    if (!exec.ok) {
      statuses[name] = "FAILED";
      failed.push(name);
      continue;
    }
    const v = await adapter.verify({
      closedDates: [input.date],
      open: "keep",
      close: "keep",
    });
    // verify hours-memory compares full state; for closure we check snapshot via execute payload
    const observed = (await adapter.read("hours", {})).data as { closedDates?: string[] } | undefined;
    const ok = observed?.closedDates?.includes(input.date) ?? v.matchesExpected;
    statuses[name] = ok ? "VERIFIED" : "EXECUTED";
    if (ok) verified.push(name);
    else failed.push(name);
  }
  if (failed.length && verified.length) {
    return {
      ask: null,
      message: `${pretty(verified)} ${verified.length === 1 ? "is" : "are"} updated. I couldn't update ${pretty(failed)} because the connection needs reconnecting.`,
      statuses,
    };
  }
  if (failed.length && !verified.length) {
    return { ask: null, message: "I couldn't update any channel.", statuses };
  }
  const waiting = Object.values(statuses).some((s) => s === "EXECUTED");
  return {
    ask: null,
    message: waiting ? ownerFacingStatus("EXECUTED") : `Closed ${input.date} is verified on ${pretty(verified)}.`,
    statuses,
  };
}

function pretty(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
