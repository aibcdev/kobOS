import { NextResponse } from "next/server";
import { TrendInput, reviewVelocityData } from "@/lib/kob/engines/server-logic";

export async function POST(request: Request) {
  try {
    const data = TrendInput.parse(await request.json());
    const result = await reviewVelocityData(data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
