import type { Metadata } from "next";
import { ServiceRequestStatus } from "@prisma/client";

import { OpsRequestsPanel } from "@/components/ops/OpsRequestsPanel";
import { catalogTitle } from "@/lib/credits/catalog";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Ops · Service tickets · KOB",
  description: "Internal queue for manual brand / service fulfillment.",
  robots: { index: false, follow: false },
};

export default async function OpsRequestsPage() {
  // Auth gated by app/ops/layout.tsx
  const [open, delivered] = await Promise.all([
    prisma.serviceRequest.findMany({
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
    }),
    prisma.serviceRequest.findMany({
      where: { status: ServiceRequestStatus.DELIVERED },
      orderBy: { deliveredAt: "desc" },
      take: 20,
      include: { restaurant: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
        Ticket rail
      </p>
      <h1 className="mt-2 font-head text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
        Service tickets
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">
        Owner green buttons land here as Requested. Pick up → do the work → mark delivered. A click is
        never “done” until you ship it.
      </p>
      <div className="mt-8">
        <OpsRequestsPanel
          initialOpen={open.map((t) => ({
            id: t.id,
            type: t.type,
            typeLabel: catalogTitle(t.type),
            status: t.status,
            title: t.title,
            notes: t.notes,
            creditCost: t.creditCost,
            createdAt: t.createdAt.toISOString(),
            restaurantId: t.restaurantId,
            restaurantName: t.restaurant.name,
            city: t.restaurant.city,
            website: t.restaurant.website,
            ownerEmail: t.restaurant.members[0]?.user.email ?? null,
          }))}
          initialDelivered={delivered.map((t) => ({
            id: t.id,
            title: t.title,
            restaurantName: t.restaurant.name,
            deliveredAt: t.deliveredAt?.toISOString() ?? null,
          }))}
        />
      </div>
    </div>
  );
}
