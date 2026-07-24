import Link from "next/link";
import { buildDecisionJourneyReport } from "@/lib/audit/decision-journey";
import type { AuditResultPayload } from "@/lib/audit/types";

/**
 * Fully server-rendered Operator Audit (Decision Journey) — no client JS required.
 */
export function AuditPlainDocument({
  restaurantName,
  city,
  websiteUrl,
  payload,
  interactiveHref,
  signupHref = "/signup",
  demoHref = "/demo",
}: {
  restaurantName: string;
  city: string;
  websiteUrl: string | null;
  payload: AuditResultPayload;
  interactiveHref: string;
  signupHref?: string;
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
    <article className="mx-auto max-w-3xl px-5 py-10 text-[var(--color-ink)] md:px-8 md:py-14">
      <header className="border-b border-[var(--color-hairline)] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          KOB public audit · simple view
        </p>
        <h1 className="mt-3 font-head text-4xl font-semibold tracking-tight">
          {report.restaurantName}
          {report.city ? ` — ${report.city}` : ""}
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">Operator Audit</p>
        <p className="text-sm text-[var(--color-muted)]">Prepared for the owner.</p>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          No login required. Plain HTML so preview tools can read the full Operator Audit without client JS.
        </p>
        <p className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href={interactiveHref} className="font-medium text-[var(--color-primary)] underline">
            Open interactive report →
          </Link>
          <Link href={signupHref} className="font-medium text-[var(--color-primary)] underline">
            Start free Daily Co-Pilot →
          </Link>
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-head text-2xl font-semibold">Opening</h2>
        <p className="mt-3 text-base leading-relaxed">{report.opening}</p>
      </section>

      <section className="mt-12">
        <h2 className="font-head text-2xl font-semibold">The Restaurant Decision Journey™</h2>
        <ol className="mt-4 space-y-4">
          {report.stages.map((s) => (
            <li key={s.id} className="border-b border-[var(--color-hairline)] pb-3">
              <p className="font-medium">
                {s.customerAction} → {s.label}
                {s.score != null ? ` → ${s.score}/100 → ${s.status}` : ""}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{s.experience}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="font-head text-2xl font-semibold">Where You’re Losing Them</h2>
        <ol className="mt-4 list-decimal space-y-4 pl-5">
          {report.dropOffs.map((d) => (
            <li key={d.stageId}>
              <p className="font-medium">{d.headline}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{d.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="font-head text-2xl font-semibold">Evidence-Based Opportunity</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">If the three leaks above are repaired:</p>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-hairline)] text-[var(--color-muted)]">
              <th className="py-2 font-medium">Metric</th>
              <th className="py-2 font-medium">Range</th>
              <th className="py-2 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--color-hairline)]">
              <td className="py-2">Customers recovered / month</td>
              <td className="py-2 tabular-nums">
                {report.evidence.customersLow} – {report.evidence.customersHigh}
              </td>
              <td className="py-2">{conf}</td>
            </tr>
            <tr>
              <td className="py-2">Revenue opportunity / month</td>
              <td className="py-2 tabular-nums">
                £{report.evidence.revenueLowGbp.toLocaleString("en-GB")} – £
                {report.evidence.revenueHighGbp.toLocaleString("en-GB")}
              </td>
              <td className="py-2">{conf}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4 text-sm font-medium">How these numbers are built</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
          {report.evidence.reasoning.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          These are ranges, not guarantees. They reflect patterns we see across similar independent
          restaurants.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-head text-2xl font-semibold">Stage-by-Stage Breakdown</h2>
        <ol className="mt-4 space-y-6">
          {report.stageDetails.map((s, i) => (
            <li key={s.stageId}>
              <p className="font-semibold">
                {i + 1} {s.stageLabel} ({s.score})
              </p>
              <p className="mt-2 text-sm">
                <span className="text-[var(--color-muted)]">Observed:</span> {s.observed}
              </p>
              <p className="mt-1 text-sm">
                <span className="text-[var(--color-muted)]">Why it matters:</span> {s.whyItMatters}
              </p>
              <p className="mt-1 text-sm">
                <span className="text-[var(--color-muted)]">Highest-leverage fix:</span>{" "}
                {s.highestLeverageFix}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="font-head text-2xl font-semibold">Competitor Analysis Framework</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-hairline)] text-[var(--color-muted)]">
              <th className="py-2 pr-3 font-medium">Factor</th>
              <th className="py-2 pr-3 font-medium">Why it matters</th>
              <th className="py-2 font-medium">What we measure</th>
            </tr>
          </thead>
          <tbody>
            {report.competitorFactors.map((f) => (
              <tr key={f.factor} className="border-b border-[var(--color-hairline)]">
                <td className="py-2 pr-3 font-medium">{f.factor}</td>
                <td className="py-2 pr-3 text-[var(--color-muted)]">{f.whyItMatters}</td>
                <td className="py-2 text-[var(--color-muted)]">{f.whatWeMeasure}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="mt-8 font-head text-lg font-semibold">
          How {report.restaurantName} currently sits
        </h3>
        <ul className="mt-3 space-y-1 text-sm">
          {report.howYouSit.map((h) => (
            <li key={h.stageLabel}>
              <strong>{h.stageLabel}:</strong> {h.position}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-head text-2xl font-semibold">30-Day Plan to Repair the Decision Journey</h2>
        <ol className="mt-4 space-y-3">
          {report.repairPlan.map((w) => (
            <li key={w.week}>
              <p className="font-semibold">
                Week {w.week} – {w.title}
              </p>
              <p className="text-sm text-[var(--color-muted)]">{w.action}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 rounded-2xl border border-[var(--color-hairline)] bg-white px-6 py-8">
        <h2 className="font-head text-xl font-semibold">Note from the audit</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{report.closer.body}</p>
        <p className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link href={signupHref} className="font-medium text-[var(--color-primary)] underline">
            Start free Daily Co-Pilot
          </Link>
          <Link href={demoHref} className="font-medium text-[var(--color-primary)] underline">
            Book a 12-minute walkthrough
          </Link>
        </p>
      </section>

      <footer className="mt-14 border-t border-[var(--color-hairline)] pt-8 text-sm text-[var(--color-muted)]">
        <Link href={interactiveHref} className="font-medium text-[var(--color-primary)] underline">
          Interactive report
        </Link>
      </footer>
    </article>
  );
}
