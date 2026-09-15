import { NextResponse } from "next/server";
import { weatherPrepData } from "@/lib/kob/engines/server-logic";

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as { city?: string };
    const result = await weatherPrepData(data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
