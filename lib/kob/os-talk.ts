import { createInMemoryHoursAdapter } from "@/lib/os/adapters/hours-memory";
import { syncHoursEverywhere } from "@/lib/os/workflows/hours";
import { applyTemporaryClosure, parseTemporaryClosure } from "@/lib/os/voice/closure";
import type { PermissionMode } from "@/lib/os/permissions";
import type { Restaurant } from "@/lib/kob/demo";
import type { ToolId } from "@/lib/kob/integrations";

function listingHours(raw: string) {
  return { open: raw, close: "" };
}

export async function talkSyncHours(input: {
  restaurant: Restaurant;
  connected?: Record<ToolId, boolean>;
  approved: boolean;
  mode: PermissionMode;
}): Promise<{ message: string; verifiedLocal: boolean; needsApproval: boolean }> {
  const googleLive = Boolean(input.connected?.google);
  const siteLive = Boolean(input.connected?.website);
  const google = createInMemoryHoursAdapter(listingHours(input.restaurant.hoursGoogle), {
    name: "google",
    failExecute: !googleLive,
  });
  const website = createInMemoryHoursAdapter(listingHours(input.restaurant.hoursWebsite), {
    name: "website",
    failExecute: !siteLive && /not listed|not published/i.test(input.restaurant.hoursWebsite),
  });
  const out = await syncHoursEverywhere({
    google: listingHours(input.restaurant.hoursGoogle),
    website: listingHours(input.restaurant.hoursWebsite),
    canonical: "website",
    permissionMode: input.mode,
    role: "OWNER",
    reliability: googleLive ? 0.94 : 0.8,
    approved: input.approved,
    adapters: { google, website },
  });
  const googleVerified = out.results.find((r) => r.channel === "google")?.status === "VERIFIED";
  let message = out.ownerMessage;
  if (googleVerified && googleLive) {
    message += " Live Google login is still required before the public listing is proof.";
  }
  return {
    message,
    verifiedLocal: googleVerified || out.results.every((r) => r.status === "VERIFIED"),
    needsApproval: out.needsApproval,
  };
}

export async function talkClosure(input: {
  utterance: string;
  connected?: Record<ToolId, boolean>;
  approved: boolean;
  mode: PermissionMode;
  now?: Date;
}): Promise<{ ask: string | null; message: string; date?: string }> {
  const intent = parseTemporaryClosure(input.utterance, input.now);
  if (!intent) return { ask: null, message: "" };
  const google = createInMemoryHoursAdapter(listingHours("open"), {
    name: "Google",
    failExecute: !input.connected?.google,
  });
  const website = createInMemoryHoursAdapter(listingHours("open"), { name: "the website" });
  const reservations = createInMemoryHoursAdapter(listingHours("open"), {
    name: "reservations",
    failExecute: !input.connected?.bookings,
  });
  const result = await applyTemporaryClosure({
    date: intent.entities.date,
    locationCount: 1,
    permissionMode: input.mode,
    role: "OWNER",
    reliability: 0.93,
    approved: input.approved,
    adapters: { Google: google, website, reservations },
  });
  return { ...result, date: intent.entities.date };
}
