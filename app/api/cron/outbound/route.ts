import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";

/** Enqueues the same outbound draft job as the scheduled cron (Vercel/Netlify compatible). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await inngest.send({ name: "outbound/daily.requested", data: { source: "http-cron" } });
  await inngest.send({ name: "outbound/send.requested", data: { source: "http-cron" } });
  return NextResponse.json({ ok: true });
}
