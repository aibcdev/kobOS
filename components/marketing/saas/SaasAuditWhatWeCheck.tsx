import Link from "next/link";

import { marketingCopy } from "@/lib/marketing/copy";

const CHECKS = [
  { title: "Scanning your website", detail: "Design, menu, and mobile experience" },
  { title: "Analysing reviews", detail: "Recent reviews and reply gaps" },
  { title: "Reviewing local presence", detail: "Google listing, hours, and photos" },
  { title: "Checking competitors", detail: "Nearby venues guests compare you to" },
  { title: "Technical & performance", detail: "Speed, SEO basics, and mobile performance" },
] as const;

/** Static checklist — not a fake in-progress scan. Live progress lives on /audit/[id]/scanning. */
export function SaasAuditWhatWeCheck() {
  return (
    <section className="bg-[#f9f6f1] px-6 py-10 md:py-14">
      <div className="mx-auto max-w-[83rem]">
        <p className="font-mono-brand text-[11px] font-semibold tracking-[0.16em] text-[var(--color-forest-mid)] uppercase">
          Free scan
        </p>
        <h2 className="font-heading mt-2 text-[1.75rem] tracking-tight text-[#1a1a1a] md:text-[2.15rem]">
          What we check in about a minute
        </h2>
        <p className="mt-2 max-w-xl text-sm text-[#2c2c2c]/70">
          Start here or on the dedicated audit. A live progress bar appears only after you run a scan — not as a homepage
          animation.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CHECKS.map((item) => (
            <li key={item.title} className="rounded-2xl border border-[#2c2c2c]/10 bg-white p-4">
              <p className="text-sm font-semibold text-[#1a1a1a]">{item.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#2c2c2c]/55">{item.detail}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/audit"
            className="inline-flex h-11 items-center rounded-full bg-[var(--color-forest)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-forest-mid)]"
          >
            {marketingCopy.cta.freeScan} on /audit
          </Link>
          <Link
            href="/go/audit"
            className="inline-flex h-11 items-center rounded-full border border-[#2c2c2c]/15 bg-white px-5 text-sm font-semibold text-[#1a1a1a] hover:border-[var(--color-forest)]"
          >
            Ads landing
          </Link>
        </div>
      </div>
    </section>
  );
}
