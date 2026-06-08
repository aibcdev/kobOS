"use client";

import { useState } from "react";

import { SaasIcon } from "./SaasIcon";

type EcosystemTab = "watch" | "fix" | "consistent";

export function SaasEcosystemTabs() {
  const [activeTab, setActiveTab] = useState<EcosystemTab>("watch");

  return (
    <section id="ecosystem" className="bg-[#f9f3ed] px-6 py-24">
      <div className="mx-auto max-w-[83rem]">
        <div className="mb-12 max-w-3xl text-left">
          <span className="font-mono-brand mb-2 block text-xs font-semibold uppercase tracking-wider text-[#088924]">
            HOW IT WORKS
          </span>
          <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-[#2c2c2c] md:text-5xl">
            We watch. You approve. Your restaurant stays consistent online.
          </h2>
        </div>

        <div className="mb-8 flex flex-wrap gap-2.5 border-b border-[#2c2c2c]/10 pb-6">
          <button
            type="button"
            onClick={() => setActiveTab("watch")}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium transition-all md:text-sm ${activeTab === "watch" ? "bg-[#094413] text-[#fbf8f5] shadow-sm" : "bg-transparent text-[#2c2c2c]/60 hover:text-[#094413]"}`}
          >
            <SaasIcon icon="solar:eye-linear" className="text-base" />
            1. We watch
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fix")}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium transition-all md:text-sm ${activeTab === "fix" ? "bg-[#094413] text-[#fbf8f5] shadow-sm" : "bg-transparent text-[#2c2c2c]/60 hover:text-[#094413]"}`}
          >
            <SaasIcon icon="solar:check-circle-linear" className="text-base" />
            2. You approve
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("consistent")}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium transition-all md:text-sm ${activeTab === "consistent" ? "bg-[#094413] text-[#fbf8f5] shadow-sm" : "bg-transparent text-[#2c2c2c]/60 hover:text-[#094413]"}`}
          >
            <SaasIcon icon="solar:calendar-linear" className="text-base" />
            3. Stay consistent
          </button>
        </div>

        <div className="relative flex min-h-[400px] flex-col items-center justify-between gap-12 overflow-hidden rounded-[3rem] border border-[#2c2c2c]/5 bg-[#f6eee5] p-8 md:flex-row md:p-12">
          {activeTab === "watch" ? (
            <div className="animate-fade-in flex w-full flex-col items-center justify-between gap-12 md:flex-row">
              <div className="w-full space-y-6 text-left md:w-1/2">
                <h3 className="font-heading text-2xl font-semibold tracking-tight text-[#094413] md:text-3xl">
                  Free scan: what guests see before they book
                </h3>
                <p className="text-sm leading-relaxed text-[#2c2c2c]/80 md:text-base">
                  We check your website, Google listing, reviews, and photos—like a mystery guest who only looks online.
                  You get a clear score and a list of gaps. No jargon.
                </p>
                <ul className="space-y-3 text-xs font-medium text-[#2c2c2c] md:text-sm">
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    About a minute, no card required
                  </li>
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Compared to strong venues in your area
                  </li>
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Plain English—not an agency deck
                  </li>
                </ul>
              </div>
              <div className="w-full space-y-4 rounded-3xl border border-[#2c2c2c]/5 bg-[#fbf8f5] p-6 shadow-sm md:w-1/2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="font-mono-brand text-xs font-semibold text-[#2c2c2c]/50">TODAY&apos;S SCAN</span>
                  <span className="rounded bg-[#088924]/10 px-2 py-0.5 font-mono-brand text-[10px] font-semibold text-[#088924]">LIVE</span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-sm text-[#2c2c2c]">
                  Website photos look dated vs local competitors
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-sm text-[#2c2c2c]">
                  2 Google reviews unanswered this week
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3 text-sm text-[#2c2c2c]">
                  Bank holiday hours not updated on listing
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "fix" ? (
            <div className="animate-fade-in flex w-full flex-col items-center justify-between gap-12 md:flex-row">
              <div className="w-full space-y-6 text-left md:w-1/2">
                <h3 className="font-heading text-2xl font-semibold tracking-tight text-[#094413] md:text-3xl">
                  Every morning: a short task list
                </h3>
                <p className="text-sm leading-relaxed text-[#2c2c2c]/80 md:text-base">
                  What needs doing, why it matters, and how long it takes. Tap approve—we prepare the draft. You review
                  before anything goes live.
                </p>
                <ul className="space-y-3 text-xs font-medium text-[#2c2c2c] md:text-sm">
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Review replies prepared for you
                  </li>
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Holiday posts drafted ahead of time
                  </li>
                </ul>
              </div>
              <div className="flex w-full flex-col gap-3 rounded-3xl border border-[#2c2c2c]/5 bg-[#fbf8f5] p-6 shadow-sm md:w-1/2">
                <div className="border-b pb-2 font-heading text-xs font-semibold text-[#094413]">AWAITING YOUR OK</div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
                  <span className="text-xs font-medium">Reply to 4-star review on Google</span>
                  <button type="button" className="rounded-full bg-[#088924] px-3 py-1 text-[11px] font-semibold text-white">
                    Approve
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
                  <span className="text-xs font-medium">Mother&apos;s Day email draft</span>
                  <button type="button" className="rounded-full bg-[#088924] px-3 py-1 text-[11px] font-semibold text-white">
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "consistent" ? (
            <div className="animate-fade-in flex w-full flex-col items-center justify-between gap-12 md:flex-row">
              <div className="w-full space-y-6 text-left md:w-1/2">
                <h3 className="font-heading text-2xl font-semibold tracking-tight text-[#094413] md:text-3xl">
                  Stop small things slipping while you run service
                </h3>
                <p className="text-sm leading-relaxed text-[#2c2c2c]/80 md:text-base">
                  Hours, menu photos, slow weeks, bank holidays—guests notice when you&apos;re off your game online. KOB
                  keeps you ahead of it.
                </p>
                <ul className="space-y-3 text-xs font-medium text-[#2c2c2c] md:text-sm">
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    UK holiday calendar built in
                  </li>
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    One helper instead of five apps
                  </li>
                </ul>
              </div>
              <div className="flex w-full justify-center md:w-1/2">
                <div className="max-w-[280px] rounded-2xl border border-[#2c2c2c]/10 bg-white p-4 text-left shadow-md">
                  <div className="mb-2 flex items-center gap-2 border-b pb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#088924] text-[10px] font-semibold text-white">
                      K
                    </div>
                    <div className="text-[10px] font-semibold">Tomorrow&apos;s reminder</div>
                  </div>
                  <p className="text-[11px] leading-normal text-gray-700">
                    &quot;Bank holiday Monday in 5 days—update your Google hours and approve the post draft when
                    ready.&quot;
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
