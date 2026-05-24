"use client";

import Link from "next/link";
import { AuditGraderHeader } from "@/components/marketing/audit/AuditGraderHeader";
import { AuditUpgradePanel } from "@/components/marketing/audit/AuditUpgradePanel";
import { ownerContainer } from "@/lib/marketing/owner-ui-classes";

export function AuditUpgradeClient({
  auditId,
  restaurantName,
  leadEmail,
}: {
  auditId: string;
  restaurantName: string;
  leadEmail: string | null;
}) {
  const checkoutHref = `/audit/${auditId}/upgrade/checkout`;

  return (
    <div className="min-h-screen bg-[var(--color-surface-cream)]">
      <AuditGraderHeader showTrialCta trialHref={checkoutHref} trialLabel="Start 7-day free trial" />
      <div className={`${ownerContainer} py-16 md:py-24`}>
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/audit/${auditId}`}
            className="type-body-sm text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-primary)]"
          >
            ← Back to your report
          </Link>
          <AuditUpgradePanel
            auditId={auditId}
            restaurantName={restaurantName}
            leadEmail={leadEmail}
            primaryHref={checkoutHref}
            primaryLabel="Start 7-day free trial"
          />
          <p className="type-caption mt-8 text-center text-[var(--color-muted-medium)]">
            Secure checkout powered by Stripe. You can cancel before the trial ends.
          </p>
        </div>
      </div>
    </div>
  );
}
