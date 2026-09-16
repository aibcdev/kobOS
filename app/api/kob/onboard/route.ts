import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichOnboardInput } from "@/lib/kob/onboard-enrich";

export const runtime = "nodejs";

const Body = z.object({
  companyName: z.string().min(2).max(200),
  role: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Company name required (2+ chars)." }, { status: 400 });
  }

  const profile = await enrichOnboardInput(parsed.data.companyName, parsed.data.role);
  return NextResponse.json({ profile });
}
