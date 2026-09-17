import Link from "next/link";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { KobWordmark } from "@/components/kob-brand/kob-mark";

const PRODUCT = [
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/onboard", label: "Try KOB" },
  { href: "/login", label: "Log in" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-management", label: "Data" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-cream text-espresso">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-16 lg:py-20">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="KOB home">
            <GreenOrb size="sm" className="!size-7" />
            <KobWordmark />
          </Link>
          <p className="mt-5 text-[1.05rem] font-medium leading-snug">
            The AI restaurant manager for independent restaurants and cafés.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Handles the repetitive work behind the restaurant — so the team can
            focus on guests. You choose what KOB can handle automatically.
          </p>
          <Link
            href="/onboard"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-espresso px-5 text-sm font-medium text-paper hover:bg-espresso/90"
          >
            Try KOB
          </Link>
        </div>

        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted">
            Product
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {PRODUCT.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-espresso hover:opacity-70">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted">
            Built for
          </p>
          <p className="mt-4 text-sm leading-relaxed">
            Independent restaurants and cafés. One to five locations.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Less admin. Lower costs. Fewer missed guests.
          </p>
        </div>

        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted">
            Legal
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {LEGAL.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-espresso hover:opacity-70">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} KOB · trykob.com</p>
          <p>You approve. Then it goes live.</p>
        </div>
      </div>
    </footer>
  );
}
