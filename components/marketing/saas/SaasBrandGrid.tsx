"use client";

import { useState } from "react";

import { SaasIcon } from "./SaasIcon";

export function SaasBrandGrid() {
  const [addedCookie, setAddedCookie] = useState(false);

  return (
    <section className="bg-[#fbf8f5] px-6 py-24">
      <div className="mx-auto max-w-[83rem] text-center">
        <div className="mx-auto mb-16 max-w-2xl">
          <span className="font-mono-brand mb-2 block text-xs font-semibold uppercase tracking-wider text-[#088924]">
            RESTAURANT FIRST TECH
          </span>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-[#2c2c2c] md:text-5xl">An extra pair of hands for your online presence.</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 text-left lg:grid-cols-3">
          <div className="flex min-h-[460px] flex-col justify-between rounded-3xl border border-[#2c2c2c]/5 bg-[#f6eee5] p-8 lg:col-span-2 lg:p-12">
            <div>
              <span className="font-mono-brand text-xs font-semibold uppercase tracking-widest text-[#088924]">
                01 // PREMIUM WEB BUILDER
              </span>
              <h3 className="font-heading mt-3 text-2xl font-semibold tracking-tight text-[#094413] md:text-3xl">
                Your restaurant website is your digital storefront
              </h3>
              <p className="mt-3 max-w-lg text-sm text-[#2c2c2c]/75 md:text-base">
                We check what guests see online—photos, menu, hours, reviews—and turn gaps into a daily task list you approve in one tap.
              </p>
            </div>

            <div className="mt-8 flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#088924]/10">
                  <SaasIcon icon="solar:globus-linear" className="text-xl text-[#088924]" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Direct Booking Engine Active</p>
                  <p className="text-[10px] text-gray-400">Load speed 0.4s — SEO Optimized</p>
                </div>
              </div>
              <span className="rounded-full bg-[#088924] px-3 py-1.5 text-[10px] font-semibold text-white">Score: 99/100</span>
            </div>
          </div>

          <div className="flex min-h-[460px] select-none flex-col justify-between rounded-3xl bg-gradient-to-br from-[#094413] to-[#088924] p-8 text-[#fbf8f5]">
            <div>
              <span className="rounded bg-white/10 px-2 py-1 font-mono-brand text-xs font-semibold uppercase tracking-widest text-[#088924]">
                02 // CONVERSION ENGINE
              </span>
              <h3 className="font-heading mt-3 text-2xl font-semibold tracking-tight">AI Smart upsells automatically increase ticket value</h3>
              <p className="mt-3 text-xs text-white/80 md:text-sm">
                Intelligent recommendation algorithms prompt orders dynamically, driving higher average order value naturally.
              </p>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
              <div className="font-mono-brand text-[10px] font-semibold uppercase tracking-wider text-white/60">AI UPSELL TRIGGERED</div>
              <div className="flex items-center justify-between text-xs">
                <span>Add Chocolate Chip Cookie?</span>
                <button
                  type="button"
                  onClick={() => setAddedCookie((v) => !v)}
                  className="rounded-lg bg-[#fbf8f5] px-2.5 py-1 font-semibold text-[10px] text-[#094413] transition-colors hover:bg-black hover:text-white"
                >
                  {addedCookie ? "Added ✓" : "+$1.99"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-[460px] flex-col justify-between rounded-3xl border border-[#2c2c2c]/5 bg-[#f6eee5] p-8 lg:col-span-3">
            <div>
              <span className="font-mono-brand text-xs font-semibold uppercase tracking-widest text-[#088924]">03 // APP STACK</span>
              <h3 className="font-heading mt-3 text-2xl font-semibold tracking-tight text-[#094413]">Your own branded mobile app</h3>
              <p className="mt-3 text-xs text-[#2c2c2c]/75 md:text-sm md:max-w-xl">
                Give your regulars a native checkout experience. Cultivate community and launch push notification rewards directly to their lock screens.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#094413] font-heading font-semibold text-white">S</div>
              <div>
                <p className="text-xs font-semibold">Your branded app</p>
                <div className="mt-0.5 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SaasIcon key={`app-star-${i}`} icon="solar:star-bold" className="text-xs text-amber-400" />
                  ))}
                  <span className="ml-1 text-[9px] text-gray-400">(1.2K Ratings)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
