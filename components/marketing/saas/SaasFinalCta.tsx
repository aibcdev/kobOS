import Link from "next/link";

import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

export function SaasFinalCta() {
  return (
    <section className="bg-[#fbf8f5] px-6 py-24">
      <div className="mx-auto max-w-[83rem]">
        <div className="relative overflow-hidden rounded-[3.5rem] bg-gradient-to-tr from-[#094413] to-[#088924] p-12 text-center text-[#fbf8f5] shadow-2xl md:p-20">
          <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />

          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
            <span className="font-mono-brand mb-4 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#088924]">
              Free first
            </span>
            <h2 className="font-heading mb-4 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              {marketingCopy.finalCtaHeadline}
            </h2>
            <p className="mb-8 max-w-lg text-sm leading-relaxed text-white/80 md:text-base">
              {marketingCopy.finalCtaSubline}
            </p>

            <div className="flex w-full flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/#audit-form"
                className="rounded-xl bg-[#094413] px-8 py-4 text-sm font-medium text-[#fbf8f5] shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-black"
              >
                {marketingCopy.cta.aiReport}
              </Link>
              <Link
                href="/demo"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-8 py-4 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
              >
                {marketingCopy.cta.freeDemo}
                <SaasIcon icon="solar:arrow-right-linear" className="text-base" />
              </Link>
            </div>

            <p className="font-mono-brand mt-6 text-xs text-white/60">{marketingCopy.finalCtaFinePrint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
