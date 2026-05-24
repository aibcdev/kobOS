import { AuditGraderHeader } from "@/components/marketing/audit/AuditGraderHeader";

/** Owner grader header — logo + Log in; trial pill when report is unlocked. */
export function AuditFunnelHeader({
  showTrialCta = false,
  ctaHref = "/pricing",
  ctaLabel = "Start 7-day free trial",
}: {
  ctaHref?: string;
  ctaLabel?: string;
  showTrialCta?: boolean;
}) {
  return (
    <AuditGraderHeader showTrialCta={showTrialCta} trialHref={ctaHref} trialLabel={ctaLabel} />
  );
}
