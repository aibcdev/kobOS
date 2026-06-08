import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { executeTaskApprove } from "@/lib/chief-of-staff/execute-task-approve";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const task = await prisma.chiefOfStaffTask.findFirst({
    where: { id, restaurantId: parsed.data.restaurantId },
  });
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await executeTaskApprove(task);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, message: result.message, nextHref: result.nextHref },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    task: result.task,
    message: result.message,
    nextHref: result.nextHref,
    contentId: result.contentId,
  });
}
