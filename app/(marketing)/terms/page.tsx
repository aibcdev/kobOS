import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · KOB",
  description: "Terms governing use of trykob.com, free scans, accounts, subscriptions, and service requests.",
};

const UPDATED = "23 July 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-[#2c2c2c]">
      <p className="font-mono-brand text-[11px] font-semibold uppercase tracking-wider text-[#088924]">Legal</p>
      <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-[#2c2c2c]/55">Last updated: {UPDATED}</p>
      <p className="mt-6 text-sm leading-relaxed text-[#2c2c2c]/80">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of <strong>KOB</strong> at{" "}
        <strong>trykob.com</strong> and related apps, APIs, and services (the &quot;Service&quot;). By using the Service
        you agree to these Terms. If you use the Service on behalf of a restaurant or company, you confirm you have
        authority to bind that organisation.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/80">
        Questions:{" "}
        <a href="mailto:hello@trykob.com" className="font-medium text-[#094413] underline underline-offset-2">
          hello@trykob.com
        </a>
        .
      </p>

      <Section title="1. What KOB provides">
        <p>Depending on your plan and usage, the Service may include:</p>
        <ul>
          <li>Free online scans of public website and listing signals</li>
          <li>Reports and scores describing guest-facing online presence</li>
          <li>A daily task list, drafts, and approvals for items such as reviews, hours, and posts</li>
          <li>Credits to request deliverables (for example website, SEO, logo, or creative work) fulfilled by KOB or
            partners</li>
          <li>Related account, billing, and support features</li>
        </ul>
        <p className="mt-3">
          Features may change as we improve the product. Scans and AI-assisted drafts are tools to help operators—they
          are not legal, financial, or professional advice, and they do not guarantee rankings, bookings, or revenue.
        </p>
      </Section>

      <Section title="2. Accounts and eligibility">
        <p>
          You must provide accurate information and keep credentials secure. You are responsible for activity under your
          account. You must be able to form a binding contract and use the Service for legitimate restaurant or
          hospitality business purposes. We may refuse, suspend, or terminate accounts that violate these Terms or create
          risk for the Service or other users.
        </p>
      </Section>

      <Section title="3. Free scans and leads">
        <p>
          Free scans may require an email and phone number to unlock the full report. You agree we may contact you about
          your report, trial, or plan using those details, consistent with our{" "}
          <Link href="/privacy" className="font-medium text-[#094413] underline underline-offset-2">
            Privacy Policy
          </Link>
          . Do not submit personal data you are not authorised to share. You must only scan restaurants or sites you own
          or are authorised to evaluate.
        </p>
      </Section>

      <Section title="4. Approvals and publish control">
        <p>
          Where the Service prepares drafts or suggested actions, <strong>you remain responsible</strong> for reviewing
          and approving what goes live on your channels. Unless you explicitly authorise otherwise, KOB does not claim
          the right to publish to your Google Business Profile, website, or social accounts without your approval in the
          product.
        </p>
      </Section>

      <Section title="5. Credits and service requests">
        <p>
          Credits may be used to request human-fulfilled work described in the product. Scope, timelines, and revision
          limits are as stated when you submit a request or in a written confirmation. Unused credits do not automatically
          convert to cash. We may decline requests that are illegal, unsafe, outside stated scope, or impractical.
        </p>
      </Section>

      <Section title="6. Subscriptions, trials, and fees">
        <p>
          Paid plans (for example Flex or Flat) are billed as described at checkout or on the pricing page. Fees may
          include a monthly subscription and, on Flex, a percentage fee on applicable orders where that feature is
          enabled. Trials convert to paid plans unless cancelled before the trial ends, as disclosed at signup. Taxes may
          apply. Except where required by law, fees are non-refundable once a billing period starts. You authorise Stripe
          (or our payment processor) to charge your payment method for amounts due.
        </p>
      </Section>

      <Section title="7. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Abuse, scrape, overload, or reverse engineer the Service except as allowed by law</li>
          <li>Upload unlawful, infringing, deceptive, or harmful content</li>
          <li>Attempt to access others&apos; accounts or data</li>
          <li>Use the Service to spam guests or violate platform rules of Google, Meta, or similar services</li>
          <li>Misrepresent your identity or your authority over a restaurant</li>
        </ul>
      </Section>

      <Section title="8. Intellectual property">
        <p>
          KOB and its licensors own the Service, branding, software, and templates. You retain rights to your restaurant
          content and materials you upload. You grant us a licence to host, process, and display that content as needed
          to operate the Service and fulfil requests you submit. Feedback you provide may be used to improve the product
          without obligation to you.
        </p>
      </Section>

      <Section title="9. Third-party services">
        <p>
          The Service integrates with third parties (for example Google Places, email, payments, AI providers). Their
          terms and privacy policies apply to their processing. We are not responsible for outages or changes by those
          providers outside our reasonable control.
        </p>
      </Section>

      <Section title="10. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW.
          WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not
          warrant uninterrupted or error-free operation, or that scans, scores, or drafts are complete or accurate for
          every market.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          To the maximum extent permitted by law, KOB and its suppliers will not be liable for indirect, incidental,
          special, consequential, or punitive damages, or lost profits, revenue, data, or goodwill. Our aggregate
          liability for claims relating to the Service in any twelve-month period will not exceed the amounts you paid us
          for the Service in that period (or £100 if you used only free features). Nothing in these Terms excludes
          liability that cannot be limited under applicable law (including for death or personal injury caused by
          negligence, or fraud).
        </p>
      </Section>

      <Section title="12. Indemnity">
        <p>
          You will defend and indemnify KOB against claims arising from your content, your misuse of the Service, or your
          violation of these Terms or applicable law, except to the extent caused by our wilful misconduct.
        </p>
      </Section>

      <Section title="13. Suspension and termination">
        <p>
          You may stop using the Service and cancel a subscription as described in-product or by contacting support.
          We may suspend or terminate access for non-payment, abuse, legal risk, or material breach. Sections that by
          nature should survive (including IP, disclaimers, liability limits, and indemnity) will survive termination.
        </p>
      </Section>

      <Section title="14. Changes to the Terms">
        <p>
          We may update these Terms. The &quot;Last updated&quot; date will change when we do. Continued use after
          changes become effective constitutes acceptance, except where applicable law requires additional notice or
          consent.
        </p>
      </Section>

      <Section title="15. Governing law">
        <p>
          These Terms are governed by the laws of England and Wales. Courts of England and Wales have exclusive
          jurisdiction, except that if you are a consumer with mandatory local rights, those rights still apply.
        </p>
      </Section>

      <Section title="16. Contact">
        <p>
          Legal and support:{" "}
          <a href="mailto:hello@trykob.com" className="font-medium text-[#094413] underline underline-offset-2">
            hello@trykob.com
          </a>
        </p>
        <p className="mt-3">
          Privacy details:{" "}
          <Link href="/privacy" className="font-medium text-[#094413] underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <p className="mt-12 text-sm">
        <Link href="/" className="text-[#094413] underline underline-offset-2">
          Back to home
        </Link>
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-lg font-semibold text-[#1a1a1a]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#2c2c2c]/80 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
