"use client";

import { useState } from "react";

import { SaasIcon } from "./SaasIcon";

type EcosystemTab = "traffic" | "conversions" | "loyalty";

export function SaasEcosystemTabs() {
  const [activeTab, setActiveTab] = useState<EcosystemTab>("traffic");

  return (
    <section id="ecosystem" className="bg-[#f9f3ed] px-6 py-24">
      <div className="mx-auto max-w-[83rem]">
        <div className="mb-12 max-w-3xl text-left">
          <span className="font-mono-brand mb-2 block text-xs font-semibold uppercase tracking-wider text-[#088924]">
            COMPLETE ECOSYSTEM
          </span>
          <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-[#2c2c2c] md:text-5xl">
            With KOB, you get more traffic, more sales, and more repeat customers.
          </h2>
        </div>

        <div className="mb-8 flex flex-wrap gap-2.5 border-b border-[#2c2c2c]/10 pb-6">
          <button
            type="button"
            onClick={() => setActiveTab("traffic")}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium transition-all md:text-sm ${activeTab === "traffic" ? "bg-[#094413] text-[#fbf8f5] shadow-sm" : "bg-transparent text-[#2c2c2c]/60 hover:text-[#094413]"}`}
          >
            <SaasIcon icon="solar:globus-linear" className="text-base" />
            1. Search Domination
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("conversions")}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium transition-all md:text-sm ${activeTab === "conversions" ? "bg-[#094413] text-[#fbf8f5] shadow-sm" : "bg-transparent text-[#2c2c2c]/60 hover:text-[#094413]"}`}
          >
            <SaasIcon icon="solar:ticket-sale-linear" className="text-base" />
            2. Direct Ordering AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("loyalty")}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-medium transition-all md:text-sm ${activeTab === "loyalty" ? "bg-[#094413] text-[#fbf8f5] shadow-sm" : "bg-transparent text-[#2c2c2c]/60 hover:text-[#094413]"}`}
          >
            <SaasIcon icon="solar:users-group-two-rounded-linear" className="text-base" />
            3. Smart Loyalty CRM
          </button>
        </div>

        <div className="relative flex min-h-[400px] flex-col items-center justify-between gap-12 overflow-hidden rounded-[3rem] border border-[#2c2c2c]/5 bg-[#f6eee5] p-8 md:flex-row md:p-12">
          {activeTab === "traffic" ? (
            <div className="animate-fade-in flex w-full flex-col items-center justify-between gap-12 md:flex-row">
              <div className="w-full space-y-6 text-left md:w-1/2">
                <h3 className="font-heading text-2xl font-semibold tracking-tight text-[#094413] md:text-3xl">
                  Dominate local search engine results
                </h3>
                <p className="text-sm leading-relaxed text-[#2c2c2c]/80 md:text-base">
                  When food lovers near you search for top-rated cuisines, your restaurant shouldn&apos;t be hidden behind massive aggregators. We automatically build and optimize local pages so you capture direct high-intent traffic instantly.
                </p>
                <ul className="space-y-3 text-xs font-medium text-[#2c2c2c] md:text-sm">
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Auto-optimized schema formatting
                  </li>
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Instant menu-item level local search discovery
                  </li>
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Real-time sync to major local map platforms
                  </li>
                </ul>
              </div>
              <div className="w-full space-y-4 rounded-3xl border border-[#2c2c2c]/5 bg-[#fbf8f5] p-6 shadow-sm md:w-1/2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="font-mono-brand text-xs font-semibold text-[#2c2c2c]/50">LOCAL SEO VISIBILITY</span>
                  <span className="rounded bg-[#088924]/10 px-2 py-0.5 font-mono-brand text-[10px] font-semibold text-[#088924]">LIVE TRACKER</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#094413]">1. Your restaurant — direct site</span>
                    <span className="text-[10px] text-gray-400">KOB-optimised</span>
                  </div>
                  <span className="font-mono-brand text-[11px] font-semibold text-[#088924]">Rank #1</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100/55 bg-white/50 p-3">
                  <span className="text-xs text-gray-400">2. Marketplace listing A</span>
                  <span className="font-mono-brand text-[11px] text-gray-400">Rank #3</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100/55 bg-white/50 p-3">
                  <span className="text-xs text-gray-400">3. Marketplace listing B</span>
                  <span className="font-mono-brand text-[11px] text-gray-400">Rank #4</span>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "conversions" ? (
            <div className="animate-fade-in flex w-full flex-col items-center justify-between gap-12 md:flex-row">
              <div className="w-full space-y-6 text-left md:w-1/2">
                <h3 className="font-heading text-2xl font-semibold tracking-tight text-[#094413] md:text-3xl">
                  Smooth, frictionless mobile ordering
                </h3>
                <p className="text-sm leading-relaxed text-[#2c2c2c]/80 md:text-base">
                  We design menus built to maximize ticket size. Our checkout experience handles payment options, tipping presets, and dynamic order tracking instantly.
                </p>
                <ul className="space-y-3 text-xs font-medium text-[#2c2c2c] md:text-sm">
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Apple Pay, Google Pay, and single-tap checkout
                  </li>
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Dynamic up-selling system based on order analysis
                  </li>
                </ul>
              </div>
              <div className="flex w-full flex-col gap-3 rounded-3xl border border-[#2c2c2c]/5 bg-[#fbf8f5] p-6 shadow-sm md:w-1/2">
                <div className="border-b pb-2 font-heading text-xs font-semibold text-[#094413]">RECOMMENDED WITH YOUR ORDER</div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
                  <span className="text-xs font-medium">Add Loaded Truffle Fries</span>
                  <button type="button" className="rounded-full bg-[#088924] px-3 py-1 text-[11px] font-semibold text-white">
                    +$4.99
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
                  <span className="text-xs font-medium">Add Soft Drink</span>
                  <button type="button" className="rounded-full bg-[#088924] px-3 py-1 text-[11px] font-semibold text-white">
                    +$2.50
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "loyalty" ? (
            <div className="animate-fade-in flex w-full flex-col items-center justify-between gap-12 md:flex-row">
              <div className="w-full space-y-6 text-left md:w-1/2">
                <h3 className="font-heading text-2xl font-semibold tracking-tight text-[#094413] md:text-3xl">
                  Turn first-timers into loyal regulars
                </h3>
                <p className="text-sm leading-relaxed text-[#2c2c2c]/80 md:text-base">
                  Automated marketing matches consumer dining patterns. Deliver personalized email and SMS offers automatically when guests haven&apos;t ordered in a while.
                </p>
                <ul className="space-y-3 text-xs font-medium text-[#2c2c2c] md:text-sm">
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    AI text messaging triggers for lapsed diners
                  </li>
                  <li className="flex items-center gap-2.5">
                    <SaasIcon icon="solar:verified-check-linear" className="text-lg text-[#088924]" />
                    Seamless loyalty system integrated in checkout
                  </li>
                </ul>
              </div>
              <div className="flex w-full justify-center md:w-1/2">
                <div className="max-w-[280px] rounded-2xl border border-[#2c2c2c]/10 bg-white p-4 text-left shadow-md">
                  <div className="mb-2 flex items-center gap-2 border-b pb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#088924] text-[10px] font-semibold text-white">S</div>
                    <div className="text-[10px] font-semibold">Your restaurant</div>
                  </div>
                  <p className="text-[11px] leading-normal text-gray-700">
                    &quot;Hi there—we missed you! Here&apos;s 15% off your next direct order. Valid this weekend only.&quot;
                  </p>
                  <div className="mt-2 text-right">
                    <span className="cursor-pointer text-[9px] font-semibold text-[#088924] underline">Redeem direct</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
