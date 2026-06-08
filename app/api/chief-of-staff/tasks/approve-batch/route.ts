import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { executeTaskApprove } from "@/lib/chief-of-staff/execute-task-approve";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  restaurantId: z.string().min(12),
  category: z.enum(["HOLIDAY"]).optional(),
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
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  const allowed = await assertRestaurantMembership(session.userId, parsed.data.restaurantId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await prisma.chiefOfStaffTask.findMany({
    where: {
      restaurantId: parsed.data.restaurantId,
      status: "PENDING",
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
    },
  });

  let approved = 0;
  let blocked = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    const result = await executeTaskApprove(task);
    if (result.ok) approved += 1;
    else {
      blocked += 1;
      errors.push(result.message);
    }
  }

  const nextHref = `/dashboard/content?r=${encodeURIComponent(parsed.data.restaurantId)}`;

  return NextResponse.json({
    ok: true,
    approved,
    blocked,
    errors: errors.slice(0, 3),
    nextHref,
    message: approved ? `Approved ${approved} campaign draft${approved === 1 ? "" : "s"}.` : errors[0] ?? "Nothing to approve.",
  });
}
