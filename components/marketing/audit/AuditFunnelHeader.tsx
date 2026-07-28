import { AuditGraderHeader } from "@/components/marketing/audit/AuditGraderHeader";

/** Owner grader header — logo + Log in; trial / unlock pill. */
export function AuditFunnelHeader({
  showTrialCta = false,
  ctaHref = "/pricing",
  ctaLabel = "Start 7-day free trial",
  onCtaClick,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  showTrialCta?: boolean;
  onCtaClick?: () => void;
}) {
  return (
    <AuditGraderHeader
      showTrialCta={showTrialCta}
      trialHref={ctaHref}
      trialLabel={ctaLabel}
      onTrialClick={onCtaClick}
    />
  );
}
