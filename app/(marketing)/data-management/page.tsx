"use client";

import type { ReactNode } from "react";
import Link from "next/link";

const UPDATED = "15 September 2026";

export default function DataManagementPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-20 pt-28 sm:px-8">
        <p className="text-sm text-muted">Legal</p>
        <h1 className="font-display text-headline mt-2 font-medium">
          Data management policy
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: {UPDATED}</p>
        <p className="mt-6 text-ink">
          This policy explains how <strong>KOB</strong> handles restaurant operations data —
          listings, Talk, house rules, kitchen materials, and connected tools — for independent
          restaurants and cafés. It sits alongside our{" "}
          <Link href="/privacy" className="underline">
            Privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline">
            Terms &amp; conditions
          </Link>
          .
        </p>
        <p className="mt-3 text-ink">
          Questions:{" "}
          <a href="mailto:hello@trykob.com" className="underline">
            hello@trykob.com
          </a>
          .
        </p>

        <Section title="1. What this covers">
          <p>
            Data created or connected when you run KOB for a room: guest-facing hours and reviews,
            Talk messages and approvals, house rules, invoice photos, weather city, website URL,
            email brief address, and status of free or partner integrations.
          </p>
        </Section>

        <Section title="2. Who owns restaurant data">
          <p>
            The restaurant (or group) remains the owner of its operational and guest-facing content.
            KOB processes that data to prepare jobs and wait for your approval. We do not claim
            ownership of your menu, listing, or guest reviews.
          </p>
        </Section>

        <Section title="3. How we store and protect it">
          <ul>
            <li>Account and workspace data on secured hosting with access controls</li>
            <li>Kitchen uploads (for example delivery notes) only when you send them</li>
            <li>Encryption in transit; backups for continuity and dispute handling</li>
            <li>Staff access limited to support and fulfilment you request</li>
          </ul>
        </Section>

        <Section title="4. Integrations and third parties">
          <ul>
            <li>
              Free tools (public Google watch, website URL, weather, invoice photo, email brief)
              only use what you turn on
            </li>
            <li>
              Paid partners (till, bookings, WhatsApp Business, delivery) only when you connect them
              later — under their terms
            </li>
            <li>We do not replace your till or publish hours without your yes</li>
          </ul>
        </Section>

        <Section title="5. Approvals and truth log">
          <p>
            Drafts stay in Holding until you approve or leave them. The truth log records jobs you
            approved. We do not invent savings figures or claim work went live without your action.
          </p>
        </Section>

        <Section title="6. Retention and deletion">
          <p>
            We keep workspace data while the account is active and for a reasonable period after for
            backups and legal needs. You may request export or deletion of restaurant data by
            emailing hello@trykob.com. Some records may remain where law requires.
          </p>
        </Section>

        <Section title="7. Multi-site groups">
          <p>
            If you run more than one room, keep house rules and connections accurate per location.
            Group admins are responsible for who can approve public changes at each site.
          </p>
        </Section>

        <Section title="8. Incidents">
          <p>
            If we become aware of a security incident affecting your restaurant data, we will notify
            you as required by law and take steps to contain it.
          </p>
        </Section>

        <Section title="9. Changes">
          <p>We may update this policy. The date above will change when we do.</p>
        </Section>

        <Section title="10. Contact">
          <p>
            <a href="mailto:hello@trykob.com" className="underline">
              hello@trykob.com
            </a>
          </p>
        </Section>

        <p className="mt-12">
          <Link href="/" className="underline">
            Back to home
          </Link>
        </p>
      </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-medium text-espresso">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
