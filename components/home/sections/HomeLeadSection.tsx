import type { HomepageContent } from "@/lib/homepage-merge";

import { DemoLeadForm } from "./DemoLeadForm";

const sectionY = "py-10 sm:py-[var(--spacing-section)]";

const cardSurface =
  "rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-[var(--spacing-lg)] text-[var(--color-body)]";

type Props = {
  leadBand: HomepageContent["leadBand"];
  stats: HomepageContent["stats"];
  statsTitle: string;
  statsSubtitle: string;
  statsFootnote: string;
  statsCtaLabel: string;
};

export function HomeLeadSection({
  leadBand,
  stats,
  statsTitle,
  statsSubtitle,
  statsFootnote,
  statsCtaLabel,
}: Props) {
  return (
    <section
      id="demo"
      className={`scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-[var(--spacing-md)] ${sectionY}`}
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div>
            <h2 className="type-title-md text-pretty text-[var(--color-ink)]">{leadBand.headline}</h2>
            <p className="type-body-md mt-6 max-w-xl text-pretty leading-snug text-[var(--color-muted)]">{leadBand.intro}</p>
          </div>
          <DemoLeadForm formTitle={leadBand.formTitle} />
        </div>

        <div className="mx-auto mt-14 max-w-3xl border-t border-[var(--color-hairline)] pt-12 text-center lg:mt-16 lg:pt-14">
          <h3 className="type-title-md">{statsTitle}</h3>
          <p className="type-body-md mt-4 text-pretty leading-snug text-[var(--color-muted)]">{statsSubtitle}</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className={`${cardSurface} text-center`}>
              <div className="type-display-lg text-[clamp(2rem,4vw,2.75rem)] leading-none text-[var(--color-ink)]">{s.value}</div>
              <div className="type-body-sm mt-2 text-[var(--color-muted-medium)]">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="type-caption mx-auto mt-8 max-w-2xl text-center text-[var(--color-muted-medium)]">{statsFootnote}</p>
        <p className="mt-6 text-center">
          <a
            href="#cases"
            className="type-button text-[var(--color-primary)] underline-offset-2 hover:text-[var(--color-primary-hover)] hover:underline"
          >
            {statsCtaLabel}
          </a>
        </p>
      </div>
    </section>
  );
}
