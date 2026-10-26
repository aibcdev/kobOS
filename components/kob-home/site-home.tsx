import Image from "next/image";
import Link from "next/link";
import { FOUNDING_PRICES } from "@/lib/billing/regional-pricing";
import { trialPromise } from "@/lib/billing/trial-days";
import { getVisitorFoundingPrice } from "@/lib/billing/visitor-region";
import { FEATURE_STATUS, homepageFeatures, POSTING, POSTING_FAQ } from "@/lib/marketing/feature-status";
import { consentedProof, show180SiteProof } from "@/lib/marketing/proof";

const GBP = FOUNDING_PRICES.GB.label;
const USD = FOUNDING_PRICES.US.label;

const MORNING = [
  {
    title: "Google says you close at 4pm. Your website says 5pm.",
    action: "Approve 5pm · Open Google",
    result: "Updated in a tap",
  },
  {
    title: "2★ review from Sam, unanswered.",
    action: "Approve, copy & open Google",
    result: "Draft ready. No refund. No admission of fault.",
  },
  {
    title: "Christmas hours missing on Google.",
    action: "Draft hours for 24–26 Dec",
    result: "Waiting for your yes",
  },
  {
    title: "Roma Foods invoice: mozzarella up 11% since last month.",
    action: "Beta · when invoices are connected",
    result: "A real price change. Not a made-up saving.",
  },
] as const;

const CONTROL = [
  { job: "Reply to 5★ reviews with no issues", setting: "Ask me" },
  { job: "Fix an hours mismatch", setting: "Ask me" },
  { job: "Reply to 1–2★ reviews", setting: "Always ask (locked)" },
  { job: "Offer refunds or discounts", setting: "Never (locked)" },
] as const;

function faq(priceLabel: string) {
  const trial = trialPromise();
  return [
    POSTING_FAQ,
    {
      q: "Will KOB post anything without me?",
      a: `No. ${POSTING.control} Refunds, discounts and replies to bad reviews always wait for you.`,
    },
    {
      q: "What if a draft is wrong?",
      a: "Every draft is editable. KOB does not promise refunds, admit fault, or mention health or legal issues in a reply. Reviews like that are always held for you.",
    },
    {
      q: "How do I know what's done?",
      a: "Every reply and fix shows where it stands: drafted, approved, or posted by you. Your morning brief shows what still needs you.",
    },
    {
      q: "Do I need to change my website or booking system?",
      a: "No. KOB works with what you have.",
    },
    {
      q: "What do I need to connect?",
      a: "Nothing, to see the first findings. Paste in your Google reviews and KOB drafts the replies. Invoices are optional.",
    },
    {
      q: "Which countries?",
      a: "The UK, Ireland, the US, Canada, Australia, New Zealand, India and South Africa.",
    },
    {
      q: "What does it cost after the trial?",
      a: `${GBP} in the UK and ${USD} elsewhere, per location per month, at the founding rate. You are seeing ${priceLabel}. No contract. If you do not add a card, the trial ends.`,
    },
    {
      q: "Who is behind KOB?",
      a: "Email hello@trykob.com. We answer from the team that builds the product.",
    },
    {
      q: "How long is the trial?",
      a: `${trial}.`,
    },
  ];
}

export async function SiteHome() {
  const price = await getVisitorFoundingPrice();
  const trial = trialPromise();
  const videoUrl = process.env.VIDEO_URL?.trim();
  const proof = consentedProof();
  const show180 = show180SiteProof();
  const features = homepageFeatures();

  return (
    <main>
      <section className="relative min-h-[88dvh] overflow-hidden bg-espresso">
        <Image
          src="/photos/hero-interior.jpg"
          alt="Looking through glass into a quiet independent restaurant"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-espresso/45" />
        <div className="relative mx-auto flex min-h-[88dvh] max-w-7xl flex-col justify-end px-5 pb-16 pt-32 sm:px-8 lg:justify-center lg:pb-24">
          <div className="max-w-xl text-paper">
            <p className="text-xs font-medium tracking-[0.14em] text-paper/75 uppercase">
              Your restaurant&apos;s new manager
            </p>
            <h1 className="font-display mt-4 text-display font-medium tracking-[-0.05em] text-paper">
              Every review answered. Every listing right. You just tap approve.
            </h1>
            <p className="mt-5 max-w-md text-lg text-paper/85">
              KOB checks your Google listing, reviews and website every morning and drafts the replies
              and fixes. You approve, tap once, and post. Nothing goes out without your OK. No new
              website. No agency.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/onboard"
                className="inline-flex h-12 items-center rounded-full bg-paper px-5 text-sm font-medium text-espresso hover:bg-cream"
              >
                Find my restaurant
              </Link>
              <a
                href={videoUrl || "#watch"}
                className="inline-flex h-12 items-center rounded-full border border-paper/40 px-5 text-sm font-medium text-paper hover:bg-paper/10"
              >
                Watch the 60-second demo
              </a>
            </div>
            <p className="mt-4 text-sm text-paper/75">{trial}. See what KOB finds in a few taps.</p>
          </div>
        </div>
      </section>

      <section id="watch" className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <h2 className="font-display text-headline font-medium">See how KOB works</h2>
        <p className="mt-3 text-ink">A minute with the morning list. Nothing goes out until you approve it.</p>
        <div className="mt-8 overflow-hidden rounded-[1.75rem] bg-espresso">
          <div className="relative aspect-video">
            <video
              className="size-full object-cover"
              poster="/photos/hero-interior.jpg"
              controls
              playsInline
              preload="metadata"
            >
              <source src="/video/kob-demo-60s.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <p className="mx-auto max-w-3xl px-5 py-8 text-center text-sm text-muted sm:px-8">
        Built for 1–5 site independents in the UK, US, Ireland, Canada, Australia, New Zealand, India
        and South Africa.
        {show180
          ? " Tested across a 180-restaurant hospitality group."
          : null}
      </p>

      <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <h2 className="font-display text-headline font-medium">What is KOB?</h2>
        <p className="mt-4 text-ink">
          KOB is the restaurant manager for independent restaurants and cafés. It checks your Google
          listing, reviews and website every morning, drafts the replies and fixes, and waits for your
          yes. You approve, tap once, and post. Choose KOB if you want to keep your website and booking
          system. Choose Owner.com if you want a full branded suite. Choose an agency if you want someone
          else to run campaigns end to end.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <h2 className="font-display text-headline font-medium">This morning, KOB found…</h2>
        <p className="mt-3 text-sm text-muted">Example morning, demo restaurant Osteria Lume.</p>
        <ol className="mt-8 space-y-4">
          {MORNING.map((card) => (
            <li key={card.title} className="rounded-[1.75rem] bg-cream p-6">
              <p className="font-medium text-espresso">{card.title}</p>
              <p className="mt-3 text-sm text-ink">{card.action}</p>
              <p className="mt-1 text-sm text-muted">{card.result}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted">Four things, ready before service. A few taps.</p>
      </section>

      <section id="how" className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">1</p>
            <h2 className="font-display mt-3 text-title font-medium">Find your restaurant</h2>
            <p className="mt-3 text-ink">
              KOB reads what guests see: your Google listing, reviews and website. No logins needed to
              start.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">2</p>
            <h2 className="font-display mt-3 text-title font-medium">Get your morning brief</h2>
            <p className="mt-3 text-ink">
              What needs you today, in two minutes, with every reply and fix already drafted.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">3</p>
            <h2 className="font-display mt-3 text-title font-medium">Approve, tap once, post</h2>
            <p className="mt-3 text-ink">
              {POSTING.control} KOB copies the words and opens Google for you. You paste and press
              Post. Automatic posting is coming soon.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <h2 className="font-display text-headline font-medium">What KOB handles</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {features.map((item) => (
            <li key={item.key} className="rounded-[1.75rem] border border-line bg-paper p-6">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                {FEATURE_STATUS[item.key] === "beta" ? "In beta" : "Ready now"}
              </p>
              <h3 className="font-display mt-2 text-title font-medium">{item.title}</h3>
              <p className="mt-3 text-ink">{item.line}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <h2 className="font-display text-headline font-medium">You decide what KOB is allowed to do</h2>
          <p className="mt-4 text-ink">
            Every job starts on Ask me. Some are locked, so KOB always asks or never does them.
          </p>
          <table className="mt-8 w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="pb-3 font-medium">Job</th>
                <th className="pb-3 font-medium">Setting</th>
              </tr>
            </thead>
            <tbody>
              {CONTROL.map((row) => (
                <tr key={row.job} className="border-t border-line">
                  <td className="py-3 pr-4 text-ink">{row.job}</td>
                  <td className="py-3 text-espresso">{row.setting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <h2 className="font-display text-headline font-medium">Keep your website and your booking system</h2>
        <p className="mt-4 text-ink">
          KOB works around them. Google Business Profile: {POSTING.status}.
        </p>
        <p className="mt-4 text-ink">
          Not for you if you want a new website or an ordering app. Others do that well. KOB is for
          owners who want what they already have to work properly.
        </p>
      </section>

      {show180 || proof.length > 0 ? (
        <section className="border-t border-line bg-paper">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
            <h2 className="font-display text-headline font-medium">Proof</h2>
            {show180 ? (
              <p className="mt-4 text-ink">
                Tested across a 180-restaurant hospitality group. Built for independents, not a chain
                rollout.
              </p>
            ) : null}
            <ul className="mt-6 space-y-4">
              {proof.map((entry) => (
                <li key={`${entry.name}-${entry.venue}`} className="rounded-[1.75rem] bg-cream p-6">
                  <p className="text-ink">{entry.quote}</p>
                  <p className="mt-3 text-sm text-muted">
                    {entry.name}, {entry.venue}, {entry.city}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section id="pricing" className="border-t border-line bg-bone">
        <div className="mx-auto max-w-lg px-5 py-16 sm:px-8">
          <h2 className="font-display text-headline font-medium">One price. One manager. Per location.</h2>
          <p className="mt-6 font-display text-5xl font-medium tracking-tight">{price.label}</p>
          <p className="mt-2 text-muted">per location / month · founding · your region</p>
          <p className="mt-4 text-ink">
            {GBP} / month in the UK. {USD} / month in the US, Canada, Australia and New Zealand, as of 20
            Oct 2026.
          </p>
          <p className="mt-3 text-ink">
            Founding rate, locked while you stay subscribed. {trial}. Month to month. No contract.
          </p>
          <p className="mt-3 text-ink">Less than one shift of an assistant manager a month.</p>
          <Link
            href="/onboard"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-espresso px-5 text-sm font-medium text-paper hover:bg-ink"
          >
            Find my restaurant
          </Link>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <h2 className="font-display text-headline font-medium">Questions</h2>
          <dl className="mt-8 space-y-6">
            {faq(price.label).map((item) => (
              <div key={item.q}>
                <dt className="font-medium text-espresso">{item.q}</dt>
                <dd className="mt-2 text-ink">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-line bg-espresso text-paper">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <h2 className="font-display text-headline font-medium">Hire the manager. Keep the restaurant.</h2>
          <p className="mt-4 text-paper/80">See what KOB finds on your Google listing and website.</p>
          <Link
            href="/onboard"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-paper px-5 text-sm font-medium text-espresso hover:bg-cream"
          >
            Find my restaurant
          </Link>
          <p className="mt-4 text-sm text-paper/70">{trial}</p>
        </div>
      </section>
    </main>
  );
}
