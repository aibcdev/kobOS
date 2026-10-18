import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-session";
import { TrendInput, reviewVelocityData } from "@/lib/kob/engines/server-logic";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  try {
    const data = TrendInput.parse(await request.json());
    const result = await reviewVelocityData(data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
