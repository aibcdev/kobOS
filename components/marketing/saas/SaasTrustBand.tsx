import { marketingCopy } from "@/lib/marketing/copy";

export function SaasTrustBand() {
  return (
    <section className="border-y border-[#2c2c2c]/5 bg-[#f9f6f1] px-6 py-12 md:py-14">
      <div className="mx-auto max-w-[83rem] text-center">
        <p className="font-mono-brand text-[11px] font-semibold tracking-[0.18em] text-[#2c2c2c]/45 uppercase">
          Who it&apos;s for
        </p>
        <p className="font-heading mx-auto mt-4 max-w-2xl text-xl font-semibold tracking-tight text-[#1a1a1a] md:text-2xl">
          {marketingCopy.trustLine}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#2c2c2c]/65">
          {marketingCopy.trustBandBody}
        </p>
      </div>
    </section>
  );
}
