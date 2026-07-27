import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";
import {
  localAdsPlanToEditorCsv,
  type LocalAdsPlan,
} from "@/lib/demand-engine/google-ads-local";
import {
  b2bAuditPlanToEditorCsv,
  type B2bAuditAdsPlan,
} from "@/lib/marketing/google-ads-b2b-audit";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { id } = await ctx.params;
  const restaurantId = new URL(req.url).searchParams.get("restaurantId") ?? "";
  if (restaurantId.length < 12) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 422 });
  }

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id, restaurantId, channel: "GOOGLE_ADS" },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const payload = campaign.payload as { source?: string };
  let csv: string;
  let filename: string;

  if (payload?.source === "kob_b2b_audit_ads") {
    const plan = campaign.payload as B2bAuditAdsPlan;
    csv = b2bAuditPlanToEditorCsv(plan);
    filename = `kob-b2b-audit-ads-${id.slice(0, 8)}.csv`;
  } else if (payload?.source === "demand_engine_google_ads_local") {
    const plan = campaign.payload as LocalAdsPlan;
    csv = localAdsPlanToEditorCsv(plan);
    filename = `kob-google-ads-local-${id.slice(0, 8)}.csv`;
  } else {
    return NextResponse.json({ error: "Invalid campaign payload" }, { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
