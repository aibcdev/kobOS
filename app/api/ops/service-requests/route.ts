import { ServiceRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { catalogTitle } from "@/lib/credits/catalog";
import { isOperatorEmail } from "@/lib/ops/is-operator";

/** Ops ticket queue — all open + recent service requests. */
export async function GET() {
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

  const tickets = await prisma.serviceRequest.findMany({
    where: {
      status: { in: [ServiceRequestStatus.REQUESTED, ServiceRequestStatus.IN_PROGRESS] },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          city: true,
          website: true,
          members: {
            where: { role: "OWNER" },
            take: 1,
            include: { user: { select: { email: true } } },
          },
        },
      },
    },
  });

  const recentDelivered = await prisma.serviceRequest.findMany({
    where: { status: ServiceRequestStatus.DELIVERED },
    orderBy: { deliveredAt: "desc" },
    take: 20,
    include: {
      restaurant: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    open: tickets.map((t) => ({
      id: t.id,
      type: t.type,
      typeLabel: catalogTitle(t.type),
      status: t.status,
      title: t.title,
      notes: t.notes,
      creditCost: t.creditCost,
      createdAt: t.createdAt,
      restaurantId: t.restaurantId,
      restaurantName: t.restaurant.name,
      city: t.restaurant.city,
      website: t.restaurant.website,
      ownerEmail: t.restaurant.members[0]?.user.email ?? null,
    })),
    delivered: recentDelivered.map((t) => ({
      id: t.id,
      title: t.title,
      restaurantName: t.restaurant.name,
      deliveredAt: t.deliveredAt,
    })),
  });
}
