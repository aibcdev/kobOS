"use client";

import Image from "next/image";
import { useId, useState } from "react";

import type { BenefitTab } from "@/lib/marketing/pillar-benefit-tabs";

import { SaasIcon } from "./SaasIcon";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tabs: BenefitTab[];
  variant?: "pills" | "underline";
};

export function SaasBenefitTabs({ eyebrow, title, subtitle, tabs, variant = "pills" }: Props) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const current = tabs[active] ?? tabs[0];
  if (!current) return null;

  return (
    <section className="px-6 py-20 md:py-24">
      <div className="mx-auto max-w-[83rem]">
        {eyebrow ? (
          <span className="font-mono-brand mb-2 block text-xs font-semibold uppercase tracking-wider text-[#088924]">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-[#2c2c2c] md:text-4xl">{title}</h2>
        {subtitle ? <p className="mt-4 max-w-2xl text-sm text-[#2c2c2c]/70 md:text-base">{subtitle}</p> : null}

        <div
          className={`mt-10 ${variant === "underline" ? "border-b border-[#2c2c2c]/10" : "flex flex-wrap gap-2"}`}
          role="tablist"
          aria-label={title}
        >
          {tabs.map((tab, i) => {
            const selected = i === active;
            if (variant === "underline") {
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(i)}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                    selected
                      ? "text-[#094413] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#094413]"
                      : "text-[#2c2c2c]/55 hover:text-[#094413]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            }
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  selected ? "bg-[#094413] text-[#fbf8f5] shadow-sm" : "text-[#2c2c2c]/60 hover:text-[#094413]"
                }`}
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
          className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16"
        >
          <div className="animate-fade-in text-left">
            <h3 className="font-heading text-2xl font-semibold tracking-tight text-[#094413] md:text-3xl">{current.headline}</h3>
            <p className="mt-4 text-sm leading-relaxed text-[#2c2c2c]/80 md:text-base">{current.body}</p>
            <ul className="mt-6 space-y-3">
              {current.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-[#2c2c2c]">
                  <SaasIcon icon="solar:verified-check-linear" className="mt-0.5 shrink-0 text-lg text-[#088924]" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#2c2c2c]/10 shadow-lg">
            <Image src={current.image} alt={current.imageAlt} fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" />
          </div>
        </div>
      </div>
    </section>
  );
}
