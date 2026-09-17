import { NextResponse } from "next/server";
import { z } from "zod";
import { createInMemoryHoursAdapter } from "@/lib/os/adapters/hours-memory";
import { syncHoursEverywhere } from "@/lib/os/workflows/hours";
import { applyTemporaryClosure, parseTemporaryClosure } from "@/lib/os/voice/closure";
import { HOURS_LABEL, POS_GUEST_LABEL, WASTE_EYE_LABEL } from "@/lib/os/readiness";
import { formatMorningBrief, attentionScore, shouldInterrupt } from "@/lib/os/attention";
import type { PermissionMode } from "@/lib/os/permissions";

export const runtime = "nodejs";

const Body = z.object({
  utterance: z.string().optional(),
  workflow: z.enum(["hours", "closure", "brief"]).default("hours"),
  approved: z.boolean().optional(),
  permissionMode: z.enum(["NEVER", "ASK", "AUTO_WITH_LIMITS", "AUTOPILOT"]).default("ASK"),
  google: z.object({ open: z.string(), close: z.string() }).optional(),
  website: z.object({ open: z.string(), close: z.string() }).optional(),
  reservationsFail: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({
    hours: HOURS_LABEL,
    wasteEye: WASTE_EYE_LABEL,
    guestPosPhone: POS_GUEST_LABEL,
  });
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const mode = parsed.data.permissionMode as PermissionMode;

  if (parsed.data.workflow === "brief") {
    const attention = attentionScore({
      impact: 90,
      urgency: 90,
      confidence: 0.9,
      novelty: 0.4,
      actionability: 1,
    });
    return NextResponse.json({
      interrupt: shouldInterrupt(attention),
      brief: formatMorningBrief({
        handled: ["Hours verified everywhere"],
        needsYou: ["Seafood invoice is 13% higher."],
        noticed: [],
      }),
    });
  }

  if (parsed.data.workflow === "closure" || parsed.data.utterance) {
    const intent = parsed.data.utterance
      ? parseTemporaryClosure(parsed.data.utterance)
      : { entities: { date: "next-monday" } };
    if (!intent) {
      return NextResponse.json({ error: "Could not understand the date." }, { status: 400 });
    }
    const google = createInMemoryHoursAdapter({ open: "09:00", close: "16:00" });
    const website = createInMemoryHoursAdapter({ open: "09:00", close: "16:00" });
    const reservations = createInMemoryHoursAdapter(
      { open: "09:00", close: "16:00" },
      { failExecute: Boolean(parsed.data.reservationsFail) },
    );
    const result = await applyTemporaryClosure({
      date: intent.entities.date,
      locationCount: 1,
      permissionMode: mode,
      role: "OWNER",
      reliability: 0.95,
      approved: parsed.data.approved,
      adapters: { Google: google, website, reservations },
    });
    return NextResponse.json(result);
  }

  const g = parsed.data.google ?? { open: "09:00", close: "17:00" };
  const w = parsed.data.website ?? { open: "09:00", close: "16:00" };
  const google = createInMemoryHoursAdapter(g);
  const website = createInMemoryHoursAdapter(w);
  const result = await syncHoursEverywhere({
    google: g,
    website: w,
    canonical: "website",
    permissionMode: mode,
    role: "OWNER",
    reliability: 0.96,
    approved: parsed.data.approved,
    adapters: { google, website },
  });
  return NextResponse.json(result);
}
