import { MARKETING_HERO } from "@/lib/marketing/assets";
import { marketingCopy } from "@/lib/marketing/copy";
import { WEBSITE_GROWTH_TABS } from "@/lib/marketing/pillar-benefit-tabs";

const STEP_VISUALS = [
  {
    kind: "checklist" as const,
    rows: [
      { label: "Website", status: "Scanned" },
      { label: "Google listing", status: "Scanned" },
      { label: "Reviews", status: "Scanned" },
      { label: "Hours", status: "Scanned" },
    ],
  },
  {
    kind: "approve" as const,
    rows: [
      { label: "2 new reviews to reply", action: "Review" },
      { label: "Draft holiday Google post", action: "Review" },
      { label: "Confirm opening hours", action: "Review" },
    ],
  },
  {
    kind: "photo" as const,
    image: MARKETING_HERO.restaurantStorefront,
    imageAlt: "Restaurant storefront",
  },
] as const;

export function SaasHowItWorks() {
  const steps = WEBSITE_GROWTH_TABS.map((tab, i) => ({
    n: String(i + 1),
    title: tab.label,
    body: tab.body,
    visual: STEP_VISUALS[i] ?? STEP_VISUALS[0],
  }));

  return (
    <section id="how-it-works" className="bg-[#f9f6f1] px-6 py-10 md:py-14">
      <div className="mx-auto max-w-[83rem]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-[2rem] tracking-tight text-[#1a1a1a] md:text-[3.15rem]">
            {marketingCopy.howItWorksHeadline}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/70 md:text-base">
            {marketingCopy.howItWorksSubline}
          </p>
        </div>

        <div className="mt-10">
          <div className="relative grid gap-8 md:grid-cols-3 md:gap-5">
            {steps.map((step, index) => (
              <article key={step.n} className="relative flex flex-col pt-5">
                {index < steps.length - 1 ? (
                  <div
                    className="pointer-events-none absolute top-9 left-[calc(50%+2.25rem)] z-0 hidden h-px w-[calc(100%-1.5rem)] border-t border-dashed border-[#2c2c2c]/20 md:block"
                    aria-hidden
                  />
                ) : null}

                <div className="relative z-10 flex flex-1 flex-col rounded-[1.5rem] border border-[#2c2c2c]/8 bg-white px-4 pb-5 pt-8 shadow-sm">
                  <span className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--color-forest)] font-heading text-sm text-white shadow-sm">
                    {step.n}
                  </span>

                  <div className="mt-2 overflow-hidden rounded-2xl bg-[#f0ebe3]">
                    {step.visual.kind === "checklist" ? (
                      <div className="mx-auto my-4 w-[78%] rounded-[1.35rem] border border-[#2c2c2c]/10 bg-white p-3 shadow-sm">
                        <p className="mb-2 text-[10px] font-semibold tracking-wider text-[#2c2c2c]/45 uppercase">
                          Today&apos;s list
                        </p>
                        <ul className="space-y-2.5 text-xs">
                          {step.visual.rows.map((row) => (
                            <li key={row.label} className="flex items-center justify-between gap-2">
                              <span className="text-[#2c2c2c]/75">{row.label}</span>
                              <span className="font-semibold text-[var(--color-forest-mid)]">
                                ✓ {row.status}
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
                        <div className="mt-3 rounded-full bg-[var(--color-forest)] py-2.5 text-center text-xs font-semibold text-white">
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

                  <h3 className="font-heading mt-5 text-[1.65rem] tracking-tight text-[#1a1a1a]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#2c2c2c]/70">{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
