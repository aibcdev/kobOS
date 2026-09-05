import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";

/** Evening catch-up + volume check. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim() || "";
  await inngest.send({
    name: "outbound/volume-watch.requested",
    data: { source: "http-cron", ...(workspaceId ? { restaurantId: workspaceId } : {}) },
  });
  return NextResponse.json({ ok: true, enqueued: ["outbound/volume-watch.requested"] });
}
