import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuditDbUnavailable } from "@/components/marketing/audit/AuditDbUnavailable";
import { AuditUpgradeClient } from "@/components/marketing/audit/AuditUpgradeClient";
import { findVisibilityAuditByIdOrSlug } from "@/lib/audit/find-audit-by-id-or-slug";
import { isPrismaDbUnreachableError } from "@/lib/db/prisma-errors";
import { prisma } from "@/lib/db/prisma";
import { SubscriptionPlan } from "@prisma/client";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const audit = await findVisibilityAuditByIdOrSlug(id);
    if (!audit) return { title: "Upgrade · KOB" };
    return { title: `Start trial · ${audit.restaurantName} · KOB` };
  } catch {
    return { title: "Upgrade · KOB" };
  }
}

export default async function AuditUpgradePage({ params }: Props) {
  const { id } = await params;
  let audit;
  try {
    const base = await findVisibilityAuditByIdOrSlug(id);
    if (!base) {
      audit = null;
    } else {
      audit = await prisma.visibilityAudit.findUnique({
        where: { id: base.id },
        select: {
          id: true,
          slug: true,
          restaurantName: true,
          leadCapturedAt: true,
          leadEmail: true,
          restaurantId: true,
          restaurant: { select: { subscriptionPlan: true, stripeSubscriptionId: true } },
        },
      });
    }
  } catch (e) {
    if (isPrismaDbUnreachableError(e)) {
      return (
        <div className="min-h-screen bg-[#f9f3ed]">
          <AuditDbUnavailable />
        </div>
      );
    }
    throw e;
  }

  if (!audit) notFound();
  const pathKey = audit.slug || audit.id;
  if (!audit.leadCapturedAt) redirect(`/audit/${pathKey}`);
  if (
    audit.restaurant?.stripeSubscriptionId ||
    (audit.restaurant?.subscriptionPlan && audit.restaurant.subscriptionPlan !== SubscriptionPlan.FREE)
  ) {
    redirect("/dashboard");
  }

  return (
    <AuditUpgradeClient auditId={audit.id} restaurantName={audit.restaurantName} leadEmail={audit.leadEmail} />
  );
}
