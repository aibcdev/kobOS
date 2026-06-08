import { industryStatsBand } from "@/lib/marketing/industry-stats";

export function SaasIndustryStatsBand() {
  return (
    <section className="border-y border-[#2c2c2c]/5 bg-[#f6eee5] px-6 py-16 md:py-20">
      <div className="mx-auto max-w-[83rem] text-center">
        <h2 className="font-heading mx-auto max-w-3xl text-2xl font-semibold tracking-tight text-[#2c2c2c] md:text-4xl">
          {industryStatsBand.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-[#2c2c2c]/65 md:text-base">{industryStatsBand.subtitle}</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {industryStatsBand.stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#2c2c2c]/10 bg-white p-8">
              <div className="font-heading text-4xl font-semibold tracking-tight text-[#094413]">{s.value}</div>
              <div className="mt-2 text-sm text-[#2c2c2c]/70">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-[#2c2c2c]/50">{industryStatsBand.footnote}</p>
      </div>
    </section>
  );
}
