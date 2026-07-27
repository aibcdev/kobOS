import { ServiceRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { isOperatorEmail } from "@/lib/ops/is-operator";

const bodySchema = z.object({
  status: z.enum(["REQUESTED", "IN_PROGRESS", "DELIVERED", "CANCELLED"]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!isOperatorEmail(user?.email)) {
    return NextResponse.json({ error: "Forbidden — operator only" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  }

  const existing = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const status = parsed.data.status as ServiceRequestStatus;
  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: {
      status,
      deliveredAt: status === "DELIVERED" ? new Date() : existing.deliveredAt,
    },
  });

  return NextResponse.json({ ok: true, request: updated });
}
