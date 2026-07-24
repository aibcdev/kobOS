import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuditDbUnavailable } from "@/components/marketing/audit/AuditDbUnavailable";
import { AuditGraderHeader } from "@/components/marketing/audit/AuditGraderHeader";
import { AuditUpgradeCheckout } from "@/components/marketing/audit/AuditUpgradeCheckout";
import { findVisibilityAuditIdOrSlugSelect } from "@/lib/audit/find-audit-by-id-or-slug";
import { ownerContainer } from "@/lib/marketing/owner-ui-classes";
import { isPrismaDbUnreachableError } from "@/lib/db/prisma-errors";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Checkout · KOB",
  description: "Start your KOB free trial.",
};

export default async function AuditUpgradeCheckoutPage({ params }: Props) {
  const { id } = await params;
  let audit;
  try {
    audit = await findVisibilityAuditIdOrSlugSelect(id, {
      id: true,
      slug: true,
      restaurantName: true,
      city: true,
      leadCapturedAt: true,
      leadEmail: true,
    });
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

  return (
    <div className="min-h-screen bg-[var(--color-surface-cream)]">
      <AuditGraderHeader
        showTrialCta
        trialHref={`/audit/${audit.id}/upgrade/checkout`}
        trialLabel="Start 7-day free trial"
      />
      <div className={ownerContainer}>
        <AuditUpgradeCheckout
          auditId={audit.id}
          restaurantName={audit.restaurantName}
          city={audit.city}
          leadEmail={audit.leadEmail}
        />
      </div>
    </div>
  );
}
