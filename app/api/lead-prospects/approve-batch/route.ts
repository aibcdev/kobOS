import { NextResponse } from "next/server";
import { LeadProspectStatus } from "@prisma/client";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { getLeadEngineConfig } from "@/lib/lead-engine/config";
import { queueProspectOutreach } from "@/lib/lead-engine/run-outreach-writer";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  max: z.number().int().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const member = await getRestaurantForMember(session.userId, parsed.data.restaurantId);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = getLeadEngineConfig();
  const max = parsed.data.max ?? config.outreachDailyCap;

  const prospects = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: parsed.data.restaurantId,
      status: LeadProspectStatus.ANALYZED,
      contactEmail: { not: null },
      outboundLeadId: null,
      kobOpportunityScore: { gte: config.minScoreForOutreach },
    },
    orderBy: [{ kobOpportunityScore: "desc" }, { createdAt: "asc" }],
    take: max,
  });

  let queued = 0;
  let skipped = 0;

  for (const prospect of prospects) {
    const result = await queueProspectOutreach(parsed.data.restaurantId, prospect);
    if (result === "queued") queued++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, queued, skipped, processed: prospects.length });
}
