import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

export function SaasTrustBand() {
  return (
    <section id="trust" className="border-y border-[#2c2c2c]/5 bg-[#fbf8f5] px-6 py-16 md:py-20">
      <div className="mx-auto max-w-[83rem] text-center">
        <p className="font-mono-brand mb-3 text-xs font-semibold uppercase tracking-wider text-[#088924]">
          Social proof
        </p>
        <h2 className="font-heading mx-auto max-w-3xl text-2xl font-semibold tracking-tight text-[#2c2c2c] md:text-4xl">
          {marketingCopy.trustLine}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-[#2c2c2c]/65 md:text-base">
          Independent restaurants, retailers, and food markets use KOB to fix visibility gaps and grow direct orders.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-[#2c2c2c]/40">
          {["Hospitality", "Retail", "Markets", "Cafés", "Quick service"].map((label) => (
            <span key={label} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <SaasIcon icon="solar:verified-check-bold" className="text-[#088924]" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
