import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServiceRequestStatus } from "@prisma/client";

import { OpsRequestsPanel } from "@/components/ops/OpsRequestsPanel";
import { catalogTitle } from "@/lib/credits/catalog";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { isOperatorEmail } from "@/lib/ops/is-operator";

export const metadata: Metadata = {
  title: "Ops · Service tickets · KOB",
  description: "Internal queue for manual brand / service fulfillment.",
  robots: { index: false, follow: false },
};

export default async function OpsRequestsPage() {
  const user = await getDashboardPageUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });
  if (!isOperatorEmail(row?.email)) {
    redirect("/dashboard?error=ops_forbidden");
  }

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
    <div className="mx-auto min-h-screen max-w-4xl bg-[#f9f6f1] px-5 py-10">
      <p className="text-xs font-semibold tracking-wide text-[#5c5c5c] uppercase">KOB · Internal ops</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1a1a1a]">Service tickets</h1>
      <p className="mt-2 max-w-xl text-sm text-[#5c5c5c]">
        Owner requests land here. Pick up → do the brand work → mark delivered. Same idea as a food
        order rail.
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
