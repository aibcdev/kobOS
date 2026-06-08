"use client";

import type { PerceptionAuditV1 } from "@/lib/audit/types";

export function AuditNarrativeSection({
  customerExperience,
  modernStandard,
}: {
  customerExperience: string;
  modernStandard: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6">
        <h3 className="font-head text-base font-semibold text-[var(--color-ink)]">
          What guests currently experience
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{customerExperience}</p>
      </div>
      <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/50 p-6">
        <h3 className="font-head text-base font-semibold text-[var(--color-ink)]">
          What a modern hospitality brand should look like
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{modernStandard}</p>
      </div>
    </div>
  );
}

export function AuditCommercialSeoBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6">
      <h3 className="font-head text-base font-semibold text-[var(--color-ink)]">Local discovery opportunity</h3>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{text}</p>
    </div>
  );
}

export function AuditReviewSocialIntel({
  reviewIntelligence,
  socialAnalysis,
}: {
  reviewIntelligence: PerceptionAuditV1["reviewIntelligence"];
  socialAnalysis: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-6">
        <h3 className="font-head text-base font-semibold text-[var(--color-ink)]">Review intelligence</h3>
        {reviewIntelligence.praiseThemes.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Guests praise</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
              {reviewIntelligence.praiseThemes.map((t) => (
                <li key={t}>+ {t}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {reviewIntelligence.complaintThemes.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Recurring friction</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--color-muted)]">
              {reviewIntelligence.complaintThemes.map((t) => (
                <li key={t}>− {t}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink)]">{reviewIntelligence.disconnect}</p>
      </div>
      <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-cream)]/50 p-6">
        <h3 className="font-head text-base font-semibold text-[var(--color-ink)]">Social & cultural presence</h3>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{socialAnalysis}</p>
      </div>
    </div>
  );
}
