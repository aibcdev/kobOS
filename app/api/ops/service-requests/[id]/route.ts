import { ServiceRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { isOperatorEmail } from "@/lib/ops/is-operator";
import { notifyOwnerDraftsReady } from "@/lib/ops/notify-service-drafts";

const bodySchema = z.object({
  status: z
    .enum(["REQUESTED", "IN_PROGRESS", "DRAFTS_READY", "APPROVED", "DELIVERED", "CANCELLED"])
    .optional(),
  drafts: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        body: z.string().max(10_000).optional(),
        assetUrl: z.string().url().optional().or(z.literal("")),
      }),
    )
    .length(3)
    .optional(),
}).refine((value) => value.status || value.drafts, { message: "status or three drafts required" });

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

  if (parsed.data.drafts) {
    await prisma.$transaction(async (tx) => {
      await tx.serviceRequestDraft.deleteMany({ where: { requestId: id } });
      await tx.serviceRequestDraft.createMany({
        data: parsed.data.drafts!.map((draft, index) => ({
          requestId: id,
          draftNumber: index + 1,
          title: draft.title,
          body: draft.body ?? "",
          assetUrl: draft.assetUrl || null,
        })),
      });
      await tx.serviceRequest.update({
        where: { id },
        data: { status: ServiceRequestStatus.DRAFTS_READY },
      });
    });
    const notified = await notifyOwnerDraftsReady(id);
    return NextResponse.json({ ok: true, draftsReady: true, notified: notified.ok });
  }

  if (!parsed.data.status) {
    return NextResponse.json({ error: "Status required" }, { status: 422 });
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
