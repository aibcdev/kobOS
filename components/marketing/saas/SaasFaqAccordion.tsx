"use client";

import { useState } from "react";

import { SaasIcon } from "./SaasIcon";

type FaqItem = { q: string; a: string };

export function SaasFaqAccordion({ title, items }: { title: string; items: readonly FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-[#f9f3ed] px-6 py-20 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading mb-10 text-center text-3xl font-semibold tracking-tight text-[#2c2c2c] md:text-4xl">
          {title}
        </h2>
        <ul className="space-y-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q} className="overflow-hidden rounded-2xl border border-[#2c2c2c]/10 bg-[#fbf8f5]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-[#2c2c2c] md:text-base"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  {item.q}
                  <SaasIcon
                    icon="solar:alt-arrow-down-linear"
                    className={`shrink-0 text-xl transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-[#2c2c2c]/5 px-5 pb-4 text-sm leading-relaxed text-[#2c2c2c]/75">
                    {item.a}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
