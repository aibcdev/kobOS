import Image from "next/image";
import type { ReactNode } from "react";

import type { HomepageContent } from "@/lib/homepage-merge";

type Band = HomepageContent["contentBand"];

type Props = {
  band: Band;
  cta: ReactNode;
};

export function HomeFeatureSplit({ band, cta }: Props) {
  return (
    <section
      id="content"
      className="scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-warm)] px-[var(--spacing-md)] py-10 sm:py-[var(--spacing-section)]"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="type-caption text-[var(--color-muted-medium)]">{band.sectionEyebrow}</p>
            <p className="type-caption mt-2 text-[var(--color-muted-medium)]">{band.sectionAccent}</p>
            <h2 className="type-title-md mt-4 text-pretty">{band.title}</h2>
          </div>
          <p className="type-body-md max-w-md text-pretty leading-snug text-[var(--color-muted)] lg:text-right">{band.body}</p>
        </div>
        <div className="mt-8">{cta}</div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {band.tiles.map((tile) => (
            <div
              key={tile.title}
              className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]"
            >
              <Image
                src={tile.imageUrl}
                alt={tile.imageAlt}
                width={800}
                height={480}
                className="aspect-[16/10] w-full object-cover"
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
              <div className="p-[var(--spacing-lg)]">
                <div className="type-title-sm text-[var(--color-ink)]">{tile.title}</div>
                <p className="type-body-sm mt-2 text-pretty text-[var(--color-muted)]">{tile.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
