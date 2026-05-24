import Image from "next/image";

import type { CarouselStory } from "@/lib/homepage-merge";

type Props = { stories: CarouselStory[] };

export function HomeStoryCarousel({ stories }: Props) {
  return (
    <section
      id="cases"
      className="scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-warm)] px-[var(--spacing-md)] py-10 sm:py-[var(--spacing-section)]"
    >
      <div className="mx-auto max-w-[1440px]">
        <p className="type-caption text-[var(--color-muted-medium)]">Customer stories</p>
        <h2 className="type-title-md mt-3 max-w-2xl text-pretty">Proof you can feel in the first quarter.</h2>
      </div>
      <div className="mx-auto mt-10 max-w-[1440px]">
        <div
          className="-mx-[var(--spacing-md)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--spacing-md)] pb-2 pt-1 [scrollbar-width:thin]"
          role="region"
          aria-label="Case study highlights"
          tabIndex={0}
        >
          {stories.map((s) => (
            <article
              key={s.name}
              className="relative w-[min(280px,85vw)] shrink-0 snap-start overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]"
            >
              <div className="relative aspect-[3/4] w-full">
                <Image src={s.imageUrl} alt={s.imageAlt} fill className="object-cover" sizes="280px" />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 p-4 text-[var(--color-on-primary)]">
                  <p className="type-display-lg text-[clamp(1.75rem,5vw,2.25rem)] leading-none text-white">{s.metric}</p>
                  <p className="type-caption mt-1 text-white/85">{s.metricLabel}</p>
                  <p className="type-title-sm mt-4 text-white">{s.name}</p>
                  {s.role ? <p className="type-body-sm mt-0.5 text-white/75">{s.role}</p> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
