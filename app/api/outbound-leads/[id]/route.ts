import { NextResponse } from "next/server";
import { OutboundLeadStatus } from "@prisma/client";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { getRestaurantForMember } from "@/lib/billing/restaurant-member";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  status: z.enum(["APPROVED", "SENT", "ARCHIVED"]),
  contactEmail: z.string().email().optional().nullable(),
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

  const lead = await prisma.outboundLead.findUnique({ where: { id } });
  if (!lead || lead.workspaceRestaurantId !== parsed.data.restaurantId) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const statusMap = {
    APPROVED: OutboundLeadStatus.APPROVED,
    SENT: OutboundLeadStatus.SENT,
    ARCHIVED: OutboundLeadStatus.ARCHIVED,
  } as const;
  const status = statusMap[parsed.data.status];

  try {
    await prisma.outboundLead.update({
      where: { id },
      data: {
        status,
        ...(parsed.data.contactEmail !== undefined
          ? { contactEmail: parsed.data.contactEmail?.trim() || null }
          : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
