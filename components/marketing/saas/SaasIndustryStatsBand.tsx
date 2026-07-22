"use client";

import { AuditBusinessSearch } from "@/components/marketing/audit/AuditBusinessSearch";
import { industryStatsBand } from "@/lib/marketing/industry-stats";

const FOOD_BG =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80";

export function SaasIndustryStatsBand() {
  return (
    <section className="relative overflow-hidden px-6 py-20 md:py-28">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FOOD_BG} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#121212]/88" />

      <div className="relative mx-auto grid max-w-[83rem] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Your website is your front door online
          </h2>
          <ul className="mt-10 space-y-6">
            {industryStatsBand.stats.map((s) => (
              <li key={s.label} className="border-l-2 border-[var(--color-bright-green)] pl-5">
                <p className="font-heading text-3xl font-semibold text-white md:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm text-white/70">{s.label}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-white/40">{industryStatsBand.footnote}</p>
        </div>

        <div className="rounded-[1.75rem] bg-white p-6 shadow-2xl sm:p-8">
          <h3 className="font-heading text-2xl font-semibold tracking-tight text-[#1a1a1a]">
            See what guests see. Start with a free scan.
          </h3>
          <p className="mt-2 text-sm text-[#2c2c2c]/65">
            Enter your restaurant name or website—results in about a minute.
          </p>
          <div className="mt-6">
            <AuditBusinessSearch variant="hero" />
          </div>
        </div>
      </div>
    </section>
  );
}
