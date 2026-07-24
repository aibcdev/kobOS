import Link from "next/link";
import type { ReactNode } from "react";
import {
  buildDecisionJourneyReport,
  type DecisionJourneyReport,
  type JourneyStatus,
} from "@/lib/audit/decision-journey";
import type { AuditResultPayload } from "@/lib/audit/types";

function statusClass(status: JourneyStatus | null) {
  if (status === "Broken") return "text-[#b45309]";
  if (status === "Leaking") return "text-[#b45309]";
  if (status === "Acceptable") return "text-[var(--color-ink)]";
  if (status === "Strong") return "text-[var(--color-forest)]";
  return "text-[var(--color-muted)]";
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--color-hairline)] pt-10">
      <h2 className="font-head text-xl font-semibold tracking-tight text-[var(--color-ink)] md:text-2xl">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function JourneyMap({ report }: { report: DecisionJourneyReport }) {
  return (
    <div className="rounded-2xl border border-[var(--color-hairline)] bg-[#f4f4f5] p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span className="font-medium uppercase tracking-wider">Journey</span>
        <span>Restaurant Decision Journey™</span>
      </div>
      <ol className="space-y-0">
        {report.stages.map((stage, i) => (
          <li key={stage.id} className="relative">
            {i < report.stages.length - 1 ? (
              <div
                className="absolute left-[0.7rem] top-8 h-[calc(100%-0.5rem)] w-px bg-[var(--color-hairline)]"
                aria-hidden
              />
            ) : null}
            <div className="flex gap-3 pb-5 last:pb-0">
              <span className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[11px] font-semibold text-[var(--color-muted)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="text-[var(--color-muted)]">{stage.customerAction}</span>
                  <span className="text-[var(--color-muted)]" aria-hidden>
                    →
                  </span>
                  <span className="font-semibold text-[var(--color-ink)]">{stage.label}</span>
                  {stage.score != null ? (
                    <>
                      <span className="text-[var(--color-muted)]" aria-hidden>
                        →
                      </span>
                      <span className="tabular-nums font-semibold">{stage.score} / 100</span>
                      <span className="text-[var(--color-muted)]" aria-hidden>
                        →
                      </span>
                      <span className={`font-semibold ${statusClass(stage.status)}`}>{stage.status}</span>
                    </>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{stage.experience}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
        This is the sequence every potential guest follows. The score at each stage shows how strong or weak
        that moment is.
      </p>
    </div>
  );
}

export function OperatorAuditReport({
  restaurantName,
  city,
  websiteUrl,
  payload,
  trialHref = "/signup",
  demoHref = "/demo",
}: {
  restaurantName: string;
  city: string;
  websiteUrl?: string | null;
  payload: AuditResultPayload;
  trialHref?: string;
  demoHref?: string;
}) {
  const report = buildDecisionJourneyReport(payload, {
    restaurantName,
    city,
    websiteUrl,
  });

  const conf =
    report.evidence.confidence === "high"
      ? "High"
      : report.evidence.confidence === "low"
        ? "Low"
        : "Medium";

  return (
    <article className="mx-auto max-w-3xl text-[var(--color-ink)]">
      <header className="pb-2">
        <h1 className="font-head text-3xl font-semibold tracking-tight md:text-4xl">
          {report.restaurantName}
          {report.city ? ` — ${report.city}` : ""}
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">Operator Audit</p>
        <p className="mt-0.5 text-sm text-[var(--color-muted)]">Prepared for the owner.</p>
      </header>

      <Section title="Opening">
        <p className="text-base leading-relaxed text-[var(--color-ink)]">{report.opening}</p>
      </Section>

      <Section title="The Restaurant Decision Journey™">
        <JourneyMap report={report} />
      </Section>

      <Section title="Where You’re Losing Them">
        <ol className="space-y-6">
          {report.dropOffs.map((d, i) => (
            <li key={d.stageId}>
              <p className="font-semibold">
                {i + 1}. {d.headline}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{d.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Evidence-Based Opportunity">
        <p className="text-sm text-[var(--color-muted)]">If the three leaks above are repaired:</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-hairline)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] bg-[#f9f6f1] text-[var(--color-muted)]">
                <th className="px-4 py-2.5 font-medium">Metric</th>
                <th className="px-4 py-2.5 font-medium">Range</th>
                <th className="px-4 py-2.5 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--color-hairline)]">
                <td className="px-4 py-3">Customers recovered / month</td>
                <td className="px-4 py-3 tabular-nums font-medium">
                  {report.evidence.customersLow} – {report.evidence.customersHigh}
                </td>
                <td className="px-4 py-3">{conf}</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Revenue opportunity / month</td>
                <td className="px-4 py-3 tabular-nums font-medium">
                  £{report.evidence.revenueLowGbp.toLocaleString("en-GB")} – £
                  {report.evidence.revenueHighGbp.toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-3">{conf}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-5 text-sm font-medium">How these numbers are built</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[var(--color-muted)]">
          {report.evidence.reasoning.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          These are ranges, not guarantees. They reflect patterns we see across similar independent
          restaurants.
        </p>
      </Section>

      <Section title="Stage-by-Stage Breakdown">
        <ol className="space-y-8">
          {report.stageDetails.map((s, i) => (
            <li key={s.stageId}>
              <p className="font-semibold">
                {i + 1} {s.stageLabel} ({s.score})
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-[var(--color-muted)]">What we observed</dt>
                  <dd className="mt-0.5">{s.observed}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Why it matters</dt>
                  <dd className="mt-0.5">{s.whyItMatters}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Highest-leverage fix</dt>
                  <dd className="mt-0.5 font-medium">{s.highestLeverageFix}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Competitor Analysis Framework">
        <div className="overflow-x-auto rounded-xl border border-[var(--color-hairline)]">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] bg-[#f9f6f1] text-[var(--color-muted)]">
                <th className="px-4 py-2.5 font-medium">Factor</th>
                <th className="px-4 py-2.5 font-medium">Why it matters to the guest</th>
                <th className="px-4 py-2.5 font-medium">What we measure</th>
              </tr>
            </thead>
            <tbody>
              {report.competitorFactors.map((f) => (
                <tr key={f.factor} className="border-b border-[var(--color-hairline)] last:border-0">
                  <td className="px-4 py-3 font-medium">{f.factor}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{f.whyItMatters}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{f.whatWeMeasure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-8 font-head text-lg font-semibold">
          How {report.restaurantName} currently sits
        </h3>
        {report.peerDataAvailable ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Versus strongest nearby independent restaurants:
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Versus typical strong independents in this market (limited nearby peer data in this scan):
          </p>
        )}
        <ul className="mt-3 space-y-1.5 text-sm">
          {report.howYouSit.map((h) => (
            <li key={h.stageLabel}>
              <span className="font-medium">{h.stageLabel}:</span>{" "}
              <span className="text-[var(--color-muted)]">{h.position}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="30-Day Plan to Repair the Decision Journey">
        <ol className="space-y-4">
          {report.repairPlan.map((w) => (
            <li key={w.week} className="border-b border-[var(--color-hairline)] pb-4 last:border-0">
              <p className="font-semibold">
                Week {w.week} – {w.title}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{w.action}</p>
            </li>
          ))}
        </ol>
      </Section>

      <section className="mt-10 rounded-2xl border border-[var(--color-hairline)] bg-[#f9f6f1] px-6 py-8 md:px-8">
        <h2 className="font-head text-xl font-semibold tracking-tight">Note from the audit</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{report.closer.body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={trialHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-forest)] px-5 text-sm font-semibold text-white no-underline hover:bg-[var(--color-forest-mid)]"
          >
            Start free Daily Co-Pilot
          </Link>
          <Link
            href={demoHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-hairline)] bg-white px-5 text-sm font-semibold text-[var(--color-ink)] no-underline"
          >
            Book a 12-minute walkthrough
          </Link>
        </div>
      </section>
    </article>
  );
}
