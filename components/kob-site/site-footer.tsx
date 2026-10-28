import Link from "next/link";
import { GreenOrb } from "@/components/kob-home/green-orb";
import { KobWordmark } from "@/components/kob-brand/kob-mark";

const PRODUCT = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#how", label: "How it works" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/about", label: "About" },
  { href: "/resources", label: "All guides" },
];

const GUIDES = [
  { href: "/resources/how-to-reply-to-bad-google-reviews-restaurants", label: "Replying to bad reviews" },
  { href: "/resources/restaurant-review-reply-templates", label: "Review reply templates" },
  { href: "/resources/keep-google-hours-and-menu-up-to-date-restaurants", label: "Keeping Google hours right" },
  { href: "/resources/kob-vs-owner-com-which-is-better", label: "KOB vs Owner.com" },
  { href: "/resources/birdeye-alternative-for-independent-restaurants", label: "Birdeye alternative" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-management", label: "Data" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-cream text-espresso">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] lg:gap-12 lg:py-20">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="KOB home">
            <GreenOrb size="sm" className="!size-7" />
            <KobWordmark />
          </Link>
          <p className="mt-5 text-[1.05rem] font-medium leading-snug">
            KOB drafts. You approve and post in one tap.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The restaurant manager for independent restaurants and cafés. One to five locations.
          </p>
          <Link
            href="/onboard"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-espresso px-5 text-sm font-medium text-paper hover:bg-espresso/90"
          >
            Find my restaurant
          </Link>
        </div>

        <nav aria-label="Product">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted">Product</p>
          <ul className="mt-4 space-y-3 text-sm">
            {PRODUCT.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-espresso hover:opacity-70">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Guides">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted">Guides</p>
          <ul className="mt-4 space-y-3 text-sm">
            {GUIDES.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-espresso hover:opacity-70">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted">Built for</p>
          <p className="mt-4 text-sm leading-relaxed">
            Independent restaurants and cafés. One to five locations.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The UK, Ireland, the US, Canada, Australia, New Zealand, India and South Africa.
          </p>
        </div>

        <nav aria-label="Legal">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted">Legal</p>
          <ul className="mt-4 space-y-3 text-sm">
            {LEGAL.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-espresso hover:opacity-70">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <a href="mailto:hello@trykob.com" className="underline underline-offset-2">
              hello@trykob.com
            </a>
          </p>
          <p className="mt-3 text-sm">
            <Link href="/for-ai" className="text-espresso hover:opacity-70">
              For assistants
            </Link>
          </p>
        </nav>
      </div>

      <div className="border-t border-line/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} KOB · trykob.com</p>
          <p>
            Nothing goes out without your OK.{" "}
            <Link href="/roadmap" className="underline underline-offset-2">
              What&apos;s coming next.
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
