import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-session";
import { limit, tooManyRequests } from "@/lib/security/rate-limit";
import { TrendInput, reviewVelocityData } from "@/lib/kob/engines/server-logic";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  const rl = await limit(`kob-engine:${session.userId}`, { windowSec: 3600, max: 30 });
  if (!rl.ok) return tooManyRequests(rl);
  try {
    const data = TrendInput.parse(await request.json());
    const result = await reviewVelocityData(data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
