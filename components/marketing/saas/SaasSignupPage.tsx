import Link from "next/link";
import { Suspense } from "react";

import { MARKETING_HERO } from "@/lib/marketing/assets";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";
import { SaasLogoWall } from "./SaasLogoWall";
import { SaasSignupTestimonials } from "./SaasSignupTestimonials";
import { SaasSignupTrialForm } from "./SaasSignupTrialForm";
import { SaasSocialProof } from "./SaasSocialProof";

const CHECKS = ["Takes less than 60 seconds", "No card required", "Get your report instantly"] as const;

export function SaasSignupPage() {
  return (
    <div className="bg-[#f9f6f1] text-[#1a1a1a]">
      <section className="px-6 pb-10 pt-8 md:pb-14 md:pt-12">
        <div className="mx-auto grid max-w-[83rem] items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="max-w-xl pt-2">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-[#2c2c2c]/55 uppercase">
              <SaasIcon icon="solar:shield-check-bold" className="text-[var(--color-forest-mid)]" />
              Trusted by 500+ restaurants &amp; cafés
            </p>

            <h1 className="font-heading mt-4 text-[2.75rem] leading-[1.08] tracking-tight text-[#1a1a1a] sm:text-[3.15rem] md:text-[3.5rem]">
              See exactly what&apos;s holding your restaurant back —{" "}
              <em className="italic font-normal text-[var(--color-forest)]">in minutes.</em>
            </h1>

            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#2c2c2c]/70 md:text-base">
              Start your free scan and get a personalized opportunity report showing what&apos;s
              costing you customers and what to fix first.
            </p>

            <ul className="mt-6 space-y-2.5 text-sm text-[#2c2c2c]/80">
              {CHECKS.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <SaasIcon icon="solar:check-circle-bold" className="text-[var(--color-forest-mid)]" />
                  {item}
                </li>
              ))}
            </ul>

            <SaasSocialProof className="mt-7" label="Trusted by 500+ restaurant owners" />
          </div>

          <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-[1.5rem] bg-white/70" />}>
            <div id="signup-form" data-signup-form>
              <SaasSignupTrialForm />
            </div>
          </Suspense>
        </div>
      </section>

      <section className="border-t border-[#2c2c2c]/5 px-6 py-10 md:py-12">
        <div className="mx-auto max-w-[83rem]">
          <SaasLogoWall label="Trusted by restaurants like yours" />
        </div>
      </section>

      <SaasSignupTestimonials />

      <section className="px-6 py-12 md:py-16">
        <div className="mx-auto max-w-[83rem]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono-brand text-[11px] font-semibold tracking-[0.16em] text-[var(--color-forest-mid)] uppercase">
              Everything you need to grow
            </p>
            <h2 className="font-heading mt-3 text-[2rem] tracking-tight text-[#1a1a1a] md:text-[3.15rem]">
              The benefits you&apos;ve always dreamed of
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/65 md:text-base">
              Clear scores, a daily list you approve, and the fixes that fill more tables—without
              another agency retainer.
            </p>
          </div>

          <div className="mt-12 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="rounded-[1.75rem] bg-[#ebe6df] p-7 md:p-9">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-forest)] shadow-sm">
                <SaasIcon icon="solar:chart-linear" className="text-xl" />
              </span>
              <h3 className="font-heading mt-5 text-[1.65rem] tracking-tight text-[#1a1a1a] md:text-[2rem]">
                See what&apos;s costing you customers
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/70 md:text-base">
                Your free opportunity report scores Google, reviews, website, and nearby
                competitors—so you know what to fix first.
              </p>
              <Link
                href="/#how-it-works"
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-forest)] hover:underline"
              >
                See how it works →
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-[1.75rem] bg-[#e8e2d8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MARKETING_HERO.restaurantStorefront}
                alt="Restaurant dining room"
                className="aspect-[5/4] w-full object-cover"
              />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/50 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:left-auto sm:right-6 sm:w-[220px]">
                <p className="text-[10px] font-semibold tracking-wider text-[#2c2c2c]/45 uppercase">
                  Opportunity score
                </p>
                <p className="font-heading mt-1 text-4xl text-[var(--color-forest)]">82</p>
                <p className="mt-1 text-xs text-[#2c2c2c]/60">~£4,200 / mo recoverable</p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-2 overflow-hidden rounded-[1.75rem] bg-[#e8e2d8] lg:order-1">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={MARKETING_HERO.restaurantWorker}
                  alt="Restaurant team member"
                  className="aspect-[5/4] w-full object-cover object-top"
                />
                <div className="absolute right-4 bottom-4 w-[min(100%,210px)] rounded-2xl border border-white/60 bg-white p-3.5 shadow-lg">
                  <p className="text-[11px] font-semibold tracking-wider text-[#2c2c2c]/45 uppercase">
                    Today&apos;s tasks
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-[#1a1a1a]">
                    <li className="flex gap-2">
                      <span className="text-[var(--color-forest-mid)]">✓</span>
                      Reply to 2 new reviews
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[var(--color-forest-mid)]">✓</span>
                      Update opening hours
                    </li>
                    <li className="flex gap-2 text-[#2c2c2c]/55">
                      <span>○</span>
                      Draft holiday post
                    </li>
                  </ul>
                  <p className="mt-3 text-center text-xs font-semibold text-[var(--color-forest)]">
                    View all tasks →
                  </p>
                </div>
              </div>
            </div>
            <div className="order-1 rounded-[1.75rem] bg-[#ebe6df] p-7 md:p-9 lg:order-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-forest)] shadow-sm">
                <SaasIcon icon="solar:users-group-rounded-linear" className="text-xl" />
              </span>
              <h3 className="font-heading mt-5 text-[1.65rem] tracking-tight text-[#1a1a1a] md:text-[2rem]">
                Win more guests. Keep more regulars.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/70 md:text-base">
                Every morning: a short daily list—reviews, hours, posts—ready for you to approve. Stay
                consistent without babysitting five apps.
              </p>
              <Link
                href="/product"
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-forest)] hover:underline"
              >
                Explore features →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 pt-4 md:pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-[2rem] tracking-tight text-[#1a1a1a] md:text-[3.15rem]">
            Ready to see your full report?
          </h2>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#2c2c2c]/75">
            {["Free 7-day trial", "No card required", "Cancel anytime"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <SaasIcon icon="solar:check-circle-bold" className="text-[var(--color-forest-mid)]" />
                {item}
              </li>
            ))}
          </ul>
          <a
            href="#signup-form"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--color-forest)] px-8 text-sm font-semibold text-white transition hover:bg-[var(--color-forest-mid)]"
          >
            Get my free report →
          </a>
          <p className="mt-4 text-sm text-[#2c2c2c]/55">{marketingCopy.trustLine}</p>
        </div>
      </section>
    </div>
  );
}
