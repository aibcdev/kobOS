import type { OsActionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { actionView } from "@/lib/agent/access";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

const STATUS_FILTER: Record<string, OsActionStatus[] | undefined> = {
  open: ["DETECTED", "PROPOSED", "AWAITING_APPROVAL", "APPROVED", "EXECUTING", "EXECUTED", "VERIFYING"],
  needs_you: ["AWAITING_APPROVAL"],
  verified: ["VERIFIED"],
  failed: ["FAILED"],
  all: undefined,
};

const query = z.object({
  restaurantId: z.string().min(1).max(64),
  status: z.enum(["open", "needs_you", "verified", "failed", "all"]).default("open"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: Request) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = query.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  const { restaurantId, status, limit } = parsed.data;

  if (!(await assertRestaurantMembership(session.userId, restaurantId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const statuses = STATUS_FILTER[status];
  const actions = await prisma.osAction.findMany({
    where: { restaurantId, ...(statuses ? { status: { in: statuses } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ actions: actions.map(actionView) });
}
