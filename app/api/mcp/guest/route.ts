import { NextResponse } from "next/server";
import { GUEST_TOOLS } from "@/lib/os/phone/agents";
import { demoBrain, guestShouldEscalate, runGuestTool } from "@/lib/os/mcp-guest";

export const runtime = "nodejs";

const SERVER_INFO = {
  name: "kob-guest-receptionist",
  version: "0.1.0",
};

export async function GET() {
  return NextResponse.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    description:
      "Guest-safe restaurant tools for a future phone agent. Not live telephony. Coming soon on trykob.com.",
    tools: GUEST_TOOLS,
    live: false,
  });
}

export async function POST(req: Request) {
  let body: { tool?: string; args?: Record<string, unknown>; utterance?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.utterance && guestShouldEscalate(body.utterance)) {
    const out = await runGuestTool("transfer_to_staff", {}, demoBrain());
    return NextResponse.json({ escalated: true, ...out });
  }
  const tool = body.tool ?? "";
  const out = await runGuestTool(tool, body.args ?? {}, demoBrain());
  return NextResponse.json(out);
}
