import { NextResponse } from "next/server";
import { talkAccess } from "@/lib/kob/talk/access";
import { listTalkConnectors } from "@/lib/kob/talk/connectors";

export async function GET(req: Request) {
  try {
    const restaurantId =
      new URL(req.url).searchParams.get("restaurantId") ?? "";
    const access = await talkAccess(restaurantId);
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    return NextResponse.json(
      { connectors: await listTalkConnectors(restaurantId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Connections couldn't load. Please retry." },
      { status: 503 },
    );
  }
}
