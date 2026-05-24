"use client";

import Image from "next/image";
import { useId, useState } from "react";

import type { HomepageContent } from "@/lib/homepage-merge";

type Tab = HomepageContent["valueTabs"][number];

type Props = { tabs: Tab[] };

export function HomeValueTabs({ tabs }: Props) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const current = tabs[active] ?? tabs[0];
  if (!current) return null;

  return (
    <section
      id="value"
      className="scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-[var(--spacing-md)] py-10 sm:py-[var(--spacing-section)]"
    >
      <div className="mx-auto max-w-[1440px]">
        <h2 className="type-title-md max-w-3xl text-pretty">How KOB shows up across your funnel.</h2>

        <div
          className="mt-8 flex flex-wrap gap-1 border-b border-[var(--color-hairline)]"
          role="tablist"
          aria-label="Product areas"
        >
          {tabs.map((tab, i) => {
            const selected = i === active;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                className={`type-button relative px-4 py-3 transition-colors ${
                  selected
                    ? "text-[var(--color-ink)] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--color-primary)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
                onClick={() => setActive(i)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel-${current.id}`}
          aria-labelledby={`${baseId}-tab-${current.id}`}
          className="mt-8 rounded-[var(--radius-lg)] bg-[var(--color-surface-beige)] p-[var(--spacing-lg)] ring-1 ring-[var(--color-hairline)] sm:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <h3 className="type-title-md text-pretty">{current.title}</h3>
              <p className="type-body-md mt-4 text-pretty leading-snug text-[var(--color-muted)]">{current.body}</p>
            </div>
            {current.imageUrl ? (
              <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-inset-hairline)] lg:max-w-none">
                <div className="type-caption flex items-center justify-between border-b border-[var(--color-hairline)] bg-[var(--color-surface-warm)] px-3 py-2 text-[var(--color-muted-medium)]">
                  <span>KOB</span>
                  <span className="tabular-nums">9:41</span>
                </div>
                <Image
                  src={current.imageUrl}
                  alt={current.imageAlt ?? ""}
                  width={640}
                  height={420}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
