import { industryStatsBand } from "@/lib/marketing/industry-stats";
import { marketingCopy } from "@/lib/marketing/copy";
import { WEBSITE_GROWTH_TABS } from "@/lib/marketing/pillar-benefit-tabs";

import { SaasIcon } from "./SaasIcon";

const STEP_ICONS = [
  "solar:eye-linear",
  "solar:check-circle-linear",
  "solar:chart-linear",
] as const;

const STEP_VISUALS = [
  {
    kind: "checklist" as const,
    rows: [
      { label: "Website", status: "Scanned" },
      { label: "Google listing", status: "Scanned" },
      { label: "Reviews", status: "Scanning" },
      { label: "Hours", status: "Scanning" },
    ],
  },
  {
    kind: "approve" as const,
    rows: [
      { label: "Reply to 2 new reviews", action: "Review" },
      { label: "Draft holiday social post", action: "Review" },
      { label: "Confirm opening hours", action: "Review" },
    ],
  },
  {
    kind: "photo" as const,
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Restaurant storefront",
  },
] as const;

const PROOF_ICONS = [
  "solar:eye-linear",
  "solar:check-circle-linear",
  "solar:camera-linear",
] as const;

export function SaasHowItWorks() {
  const steps = WEBSITE_GROWTH_TABS.map((tab, i) => ({
    n: String(i + 1),
    title: tab.label,
    body: tab.body,
    icon: STEP_ICONS[i] ?? STEP_ICONS[0],
    visual: STEP_VISUALS[i] ?? STEP_VISUALS[0],
  }));

  return (
    <section id="how-it-works" className="bg-[#f9f6f1] px-6 py-10 md:py-14">
      <div className="mx-auto max-w-[83rem]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl tracking-tight text-[#1a1a1a] md:text-5xl">
            {marketingCopy.howItWorksHeadline}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/70 md:text-base">
            {marketingCopy.howItWorksSubline}
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.n}
                className="flex flex-col rounded-[1.5rem] border border-[#2c2c2c]/8 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-forest)] font-heading text-sm text-white">
                    {step.n}
                  </span>
                  <SaasIcon icon={step.icon} className="text-xl text-[var(--color-forest-mid)]" />
                </div>

                <div className="overflow-hidden rounded-2xl bg-[#f0ebe3]">
                  {step.visual.kind === "checklist" ? (
                    <div className="mx-auto my-4 w-[72%] rounded-[1.25rem] border border-[#2c2c2c]/10 bg-white p-3 shadow-sm">
                      <ul className="space-y-2.5 text-xs">
                        {step.visual.rows.map((row) => (
                          <li key={row.label} className="flex items-center justify-between gap-2">
                            <span className="text-[#2c2c2c]/75">{row.label}</span>
                            <span
                              className={
                                row.status === "Scanned"
                                  ? "font-semibold text-[var(--color-forest-mid)]"
                                  : "text-[#9a6b3a]"
                              }
                            >
                              {row.status === "Scanned" ? "✓ " : ""}
                              {row.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {step.visual.kind === "approve" ? (
                    <div className="p-3">
                      <p className="mb-2 text-[10px] font-semibold tracking-wider text-[#2c2c2c]/45 uppercase">
                        Today&apos;s list
                      </p>
                      <ul className="space-y-2">
                        {step.visual.rows.map((row) => (
                          <li
                            key={row.label}
                            className="flex items-center justify-between gap-2 rounded-xl bg-white px-2.5 py-2 text-xs shadow-sm"
                          >
                            <span className="text-[#1a1a1a]">{row.label}</span>
                            <span className="rounded-full border border-[#2c2c2c]/12 px-2 py-0.5 font-medium text-[#2c2c2c]/60">
                              {row.action}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 rounded-full bg-[var(--color-forest)] py-2 text-center text-xs font-semibold text-white">
                        Approve all
                      </div>
                    </div>
                  ) : null}
                  {step.visual.kind === "photo" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={step.visual.image}
                      alt={step.visual.imageAlt}
                      className="aspect-[4/5] w-full object-cover"
                    />
                  ) : null}
                </div>

                <h3 className="font-heading mt-5 text-2xl tracking-tight text-[#1a1a1a]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#2c2c2c]/70">{step.body}</p>
              </article>
            ))}
          </div>

          <aside className="rounded-[1.75rem] bg-[#efe8df] px-6 py-8 sm:px-8">
            <p className="font-mono-brand text-[11px] font-semibold tracking-[0.16em] text-[var(--color-forest-mid)] uppercase">
              The proof
            </p>
            <p className="mt-2 text-sm text-[#2c2c2c]/60">
              Most restaurants lose customers online and don’t know where.
            </p>
            <ul className="mt-5 space-y-5">
              {industryStatsBand.stats.map((stat, i) => (
                <li key={stat.label} className="flex gap-4">
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-forest)] shadow-sm">
                    <SaasIcon icon={PROOF_ICONS[i] ?? PROOF_ICONS[0]} />
                  </span>
                  <div>
                    <p className="font-heading text-4xl tracking-tight text-[var(--color-forest-mid)] md:text-5xl">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#2c2c2c]/70">{stat.label}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-[#2c2c2c]/40">{industryStatsBand.footnote}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
