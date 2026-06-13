import { NextResponse } from "next/server";
import { LeadProspectStatus } from "@prisma/client";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { queueProspectOutreach } from "@/lib/lead-engine/run-outreach-writer";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  status: z.enum(["QUEUED", "ARCHIVED"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
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

  const prospect = await prisma.leadProspect.findUnique({ where: { id } });
  if (!prospect || prospect.workspaceRestaurantId !== parsed.data.restaurantId) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  if (parsed.data.status === "ARCHIVED") {
    await prisma.leadProspect.update({
      where: { id },
      data: { status: LeadProspectStatus.ARCHIVED },
    });
    return NextResponse.json({ ok: true, status: "ARCHIVED" });
  }

  const result = await queueProspectOutreach(parsed.data.restaurantId, prospect);
  if (result !== "queued") {
    return NextResponse.json({ error: result }, { status: 422 });
  }

  return NextResponse.json({ ok: true, status: "QUEUED" });
}
