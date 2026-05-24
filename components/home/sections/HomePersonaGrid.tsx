import Image from "next/image";

import type { HomepageContent } from "@/lib/homepage-merge";

type Persona = HomepageContent["personas"][number];

type Props = { personas: Persona[] };

export function HomePersonaGrid({ personas }: Props) {
  return (
    <section
      id="personas"
      className="scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-beige)] px-[var(--spacing-md)] py-10 sm:py-[var(--spacing-section)]"
    >
      <div className="mx-auto grid max-w-[1440px] gap-5 md:grid-cols-3 md:gap-6">
        {personas.map((p) => (
          <article
            key={p.title}
            className="relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-dark)] text-[var(--color-on-primary)]"
          >
            <Image src={p.imageUrl} alt={p.imageAlt} fill className="object-cover opacity-60" sizes="(min-width: 768px) 33vw, 100vw" />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
              aria-hidden
            />
            <div className="relative z-[1] p-[var(--spacing-lg)]">
              {p.statChip ? (
                <span className="type-caption mb-3 inline-block rounded-[var(--radius-pill)] border border-white/25 bg-black/30 px-3 py-1 text-white/95 backdrop-blur-sm">
                  {p.statChip}
                </span>
              ) : null}
              <p className="type-caption text-white/80">{p.segment}</p>
              <h3 className="type-title-md mt-2 max-w-[18ch] text-pretty text-white">{p.title}</h3>
              <p className="type-body-md mt-3 max-w-prose text-pretty leading-snug text-white/85">{p.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
