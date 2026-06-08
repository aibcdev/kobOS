import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";

/** Enqueues the same outbound draft job as the scheduled cron (Vercel/Netlify compatible). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events: { name: string; data: { source: string } }[] = [
    { name: "outbound/send.requested", data: { source: "http-cron" } },
    { name: "outbound/audit-import.requested", data: { source: "http-cron" } },
  ];

  if (process.env.OUTBOUND_MODE?.trim().toLowerCase() === "uk_cold") {
    events.push({ name: "outbound/uk-cold.requested", data: { source: "http-cron" } });
  } else {
    events.push({ name: "outbound/daily.requested", data: { source: "http-cron" } });
  }

  await inngest.send(events);
  return NextResponse.json({ ok: true, enqueued: events.map((e) => e.name) });
}
