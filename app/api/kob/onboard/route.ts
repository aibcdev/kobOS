import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichOnboardInput } from "@/lib/kob/onboard-enrich";
import { clientIpFromHeaders, dailyBudget, limit, tooManyRequests } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  companyName: z.string().min(2).max(200),
  role: z.string().max(40).optional(),
});

// DECISION: stays public — /onboard is the anonymous "Try KOB" funnel (hero, nav, /trial). Rate-limited per IP instead.
export async function POST(req: Request) {
  const rl = await limit(`kob-onboard:${clientIpFromHeaders(req.headers) ?? "unknown"}`, { windowSec: 3600, max: 20 });
  if (!rl.ok) return tooManyRequests(rl);
  const budget = await dailyBudget("kob-onboard", "KOB_ONBOARD_DAILY_MAX", 2000);
  if (!budget.ok) return tooManyRequests(budget, "Setup is busy right now. Please try again later.");
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
