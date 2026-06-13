"use client";

import { useState } from "react";

import { AuditBusinessSearch } from "@/components/marketing/audit/AuditBusinessSearch";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

const MOCK_IMAGE =
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80";

export function SaasHeroSection() {
  const [addedNaan, setAddedNaan] = useState(false);

  const totalDisplay = addedNaan ? "$20.49" : "$18.99";
  const savedDisplay = addedNaan ? "$15.32" : "$14.20";

  return (
    <section
      id="audit-form"
      className="relative overflow-hidden px-6 pb-24 pt-16 md:pb-32 md:pt-24"
      style={{
        backgroundImage: "radial-gradient(rgba(8, 137, 36, 0.05) 1.5px, transparent 1.5px)",
        backgroundSize: "32px 32px",
      }}
    >
      <div className="mx-auto flex max-w-[83rem] flex-col items-center text-center">
        <span className="font-mono-brand mb-4 rounded-full bg-[#088924]/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-[#088924]">
          {marketingCopy.trustLineShort}
        </span>

        <h1 className="font-heading mb-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-[#2c2c2c] md:text-6xl">
          {marketingCopy.heroHeadline}
        </h1>
        <p className="mb-10 max-w-2xl text-sm text-[#2c2c2c]/75 md:text-base">{marketingCopy.heroSubline}</p>

        <div className="mb-16 w-full max-w-xl px-2">
          <AuditBusinessSearch variant="hero" />
        </div>

        <div className="relative flex w-full items-center justify-center overflow-hidden rounded-[3rem] bg-gradient-to-tr from-[#094413] to-[#088924] p-8 shadow-2xl md:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />

          <div className="relative flex max-w-[340px] flex-shrink-0 flex-col overflow-hidden rounded-[3.5rem] border-4 border-gray-800 bg-black p-3.5 shadow-2xl [aspect-ratio:9/19]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-white/0 via-white/5 to-white/10" />

            <div className="relative flex h-full flex-col overflow-hidden rounded-[2.75rem] bg-[#fbf8f5] p-4 text-left [-webkit-user-select:none] select-none">
              <div className="font-mono-brand mb-4 flex justify-between text-[11px] text-[#2c2c2c]/60">
                <span>9:41 AM</span>
                <div className="flex items-center gap-1.5">
                  <SaasIcon icon="solar:connection-status-linear" className="text-xs" />
                  <SaasIcon icon="solar:battery-charge-linear" className="text-xs" />
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="font-mono-brand text-[10px] font-semibold uppercase tracking-wider text-[#088924]">ORDER DIRECT</span>
                  <h4 className="font-heading text-sm font-bold tracking-tight text-[#2c2c2c]">Basil & Clover</h4>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-[#094413]/5 px-2.5 py-1 text-xs font-semibold text-[#094413]">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#088924]" />
                  Open
                </span>
              </div>

              <div className="mb-3 flex flex-1 flex-col justify-between rounded-2xl border border-[#2c2c2c]/5 bg-white p-2.5 shadow-sm">
                <div>
                  <div
                    className="mb-2.5 aspect-[4/3] w-full rounded-xl bg-cover bg-center"
                    style={{ backgroundImage: `url('${MOCK_IMAGE}')` }}
                  />
                  <h5 className="font-heading text-xs font-bold leading-tight text-[#2c2c2c]">Spicy Crispy Chicken Bowl</h5>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-[#2c2c2c]/60">
                    Avocado wild rice, warm chicken breast, spicy house aioli.
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-dashed border-gray-100 pt-2">
                  <div>
                    <span className="font-mono-brand block text-[8px] font-semibold uppercase text-[#088924]">AI RECOMMENDED</span>
                    <span className="text-[10px] font-medium text-[#2c2c2c]">Add Garlic Naan?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddedNaan((v) => !v)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-semibold text-white transition-all ${addedNaan ? "bg-[#094413]" : "bg-[#088924] hover:bg-[#094413]"}`}
                  >
                    {addedNaan ? "Added ✓" : "+$1.50"}
                    {!addedNaan ? <SaasIcon icon="solar:add-circle-linear" className="text-xs" /> : null}
                  </button>
                </div>
              </div>

              <div className="shadow-md mb-2 rounded-xl bg-[#094413] p-3 text-center text-[#fbf8f5] transition-all">
                <span className="font-mono-brand mb-0.5 block text-[10px] font-bold uppercase tracking-widest text-[#088924]">
                  YOUR PROFITS
                </span>
                <p className="font-heading mt-0.5 text-base font-semibold">Saved {savedDisplay} on this order</p>
                <p className="text-[9px] text-white/60">0% third-party commission paid</p>
              </div>

              <div className="mt-auto flex items-center justify-between rounded-full border border-[#2c2c2c]/5 bg-white p-1.5 shadow-md">
                <span className="pl-3 text-xs font-bold text-[#2c2c2c]">{totalDisplay}</span>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full bg-[#094413] px-4 py-2 text-[11px] font-medium text-white transition-colors hover:bg-black"
                >
                  Checkout Direct
                  <SaasIcon icon="solar:arrow-right-linear" className="text-xs" />
                </button>
              </div>
            </div>
          </div>

          <div className="absolute left-16 top-1/3 hidden max-w-[180px] -rotate-3 rounded-2xl bg-[#fbf8f5]/90 p-4 text-left shadow-xl backdrop-blur-md transition-transform duration-300 hover:rotate-0 lg:block">
            <SaasIcon icon="solar:graph-up-linear" className="mb-1 text-2xl text-[#088924]" />
            <h4 className="font-heading text-lg font-bold tracking-tight text-[#094413]">Daily task list</h4>
            <p className="text-[11px] leading-normal text-[#2c2c2c]/70">Reviews, holidays, hours—what needs your OK today</p>
          </div>

          <div className="absolute bottom-1/4 right-16 hidden max-w-[200px] rotate-3 rounded-2xl bg-[#fbf8f5]/90 p-4 text-left shadow-xl backdrop-blur-md transition-transform duration-300 hover:rotate-0 lg:block">
            <SaasIcon icon="solar:bell-linear" className="mb-1 text-2xl text-[#088924]" />
            <h4 className="font-heading text-lg font-bold tracking-tight text-[#094413]">Never miss a beat</h4>
            <p className="text-[11px] leading-normal text-[#2c2c2c]/70">We watch your online presence so you can run the floor</p>
          </div>
        </div>
      </div>
    </section>
  );
}
