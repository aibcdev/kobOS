import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";

/** Enqueues the same outbound draft job as the scheduled cron (Vercel/Netlify compatible). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim() || "";
  const base = { source: "http-cron", ...(workspaceId ? { restaurantId: workspaceId } : {}) };

  const events: { name: string; data: Record<string, string> }[] = [
    { name: "lead-engine/finder.requested", data: { ...base } },
    { name: "lead-engine/analyzer.requested", data: { ...base } },
    { name: "lead-engine/outreach-writer.requested", data: { ...base } },
    { name: "outbound/send.requested", data: { ...base } },
    { name: "outbound/audit-import.requested", data: { ...base } },
  ];

  if (process.env.OUTBOUND_MODE?.trim().toLowerCase() === "uk_cold") {
    events.push({ name: "outbound/uk-cold.requested", data: { ...base } });
  } else {
    events.push({ name: "outbound/daily.requested", data: { ...base } });
  }

  await inngest.send(events);
  return NextResponse.json({ ok: true, enqueued: events.map((e) => e.name) });
}
