import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-session";
import { weatherPrepData } from "@/lib/kob/engines/server-logic";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  try {
    const data = (await request.json()) as { city?: string };
    const result = await weatherPrepData(data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
