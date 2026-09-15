import { NextResponse } from "next/server";
import { TalkInputSchema, talkToKobData } from "@/lib/kob/ai/talk-logic";

export async function POST(request: Request) {
  try {
    const data = TalkInputSchema.parse(await request.json());
    const result = await talkToKobData(data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
