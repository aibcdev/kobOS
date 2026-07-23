import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · KOB",
  description:
    "How KOB collects, uses, and protects personal data when you run a free scan or use trykob.com.",
};

const UPDATED = "23 July 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-[#2c2c2c]">
      <p className="font-mono-brand text-[11px] font-semibold uppercase tracking-wider text-[#088924]">Legal</p>
      <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[#2c2c2c]/55">Last updated: {UPDATED}</p>
      <p className="mt-6 text-sm leading-relaxed text-[#2c2c2c]/80">
        This Privacy Policy explains how <strong>KOB</strong> (&quot;we&quot;, &quot;us&quot;) handles personal data when you
        visit <strong>trykob.com</strong>, run a free online scan, create an account, or use our restaurant helper
        (daily tasks, drafts, credits, and service requests).
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/80">
        If you have questions, email{" "}
        <a href="mailto:hello@trykob.com" className="font-medium text-[#094413] underline underline-offset-2">
          hello@trykob.com
        </a>
        .
      </p>

      <Section title="1. Who we are">
        <p>
          KOB operates the trykob.com website and related services. For data protection purposes we are the controller of
          personal data described in this policy, unless we process data solely on behalf of a restaurant under a separate
          written agreement (in which case that agreement controls).
        </p>
      </Section>

      <Section title="2. What we collect">
        <p>Depending on how you use KOB, we may collect:</p>
        <ul>
          <li>
            <strong>Contact details</strong> — work email and mobile number when you unlock a free scan report, book a
            demo, or create an account.
          </li>
          <li>
            <strong>Restaurant &amp; business details</strong> — name, website URL, address, Google Place ID, public
            listing information, photos, reviews, and similar publicly available online presence data used to run your
            scan and daily helper.
          </li>
          <li>
            <strong>Account &amp; usage data</strong> — sign-in events, task approvals, drafts, credit balance, service
            requests, preferences, and product interactions.
          </li>
          <li>
            <strong>Billing data</strong> — subscription plan and payment status. Card details are processed by Stripe;
            we do not store full card numbers on our servers.
          </li>
          <li>
            <strong>Technical data</strong> — IP address, device/browser type, approximate location derived from IP,
            cookies or similar technologies, and diagnostic logs needed to keep the service secure and reliable.
          </li>
        </ul>
      </Section>

      <Section title="3. How we use personal data">
        <p>We use personal data to:</p>
        <ul>
          <li>Deliver free scans and reports, and build your daily task list and drafts</li>
          <li>Create and secure your account (including magic links and one-time codes)</li>
          <li>Fulfil credit-backed service requests (for example website, SEO, or brand work)</li>
          <li>Process subscriptions, trials, and invoices</li>
          <li>Respond to demos, support, and product messages you request</li>
          <li>Improve accuracy, safety, and performance of the product</li>
          <li>Comply with law and enforce our Terms of Service</li>
        </ul>
        <p className="mt-3">
          We do <strong>not</strong> sell your personal data. We do not use your scan content to train public third-party
          AI models for unrelated commercial products.
        </p>
      </Section>

      <Section title="4. Legal bases (UK GDPR / GDPR)">
        <p>Where UK or EU data protection law applies, we rely on:</p>
        <ul>
          <li>
            <strong>Contract</strong> — to provide the scan, account, subscription, and requested services
          </li>
          <li>
            <strong>Legitimate interests</strong> — to secure the platform, prevent abuse, and improve features in ways
            that do not override your rights
          </li>
          <li>
            <strong>Consent</strong> — where required (for example certain cookies or optional marketing emails); you can
            withdraw consent at any time
          </li>
          <li>
            <strong>Legal obligation</strong> — where we must keep records or respond to lawful requests
          </li>
        </ul>
      </Section>

      <Section title="5. Sharing and processors">
        <p>We share personal data only with providers who help us run KOB, under appropriate agreements, such as:</p>
        <ul>
          <li>Hosting and infrastructure (for example Netlify and database providers)</li>
          <li>Authentication and account storage (for example Supabase)</li>
          <li>Email delivery (for example Resend)</li>
          <li>Payments (Stripe)</li>
          <li>Maps / Places data (Google) when you search for or enrich a restaurant listing</li>
          <li>AI providers used to generate scores, summaries, or drafts inside the product</li>
        </ul>
        <p className="mt-3">
          We may also disclose data if required by law, to protect rights and safety, or as part of a business transfer
          (with appropriate safeguards).
        </p>
      </Section>

      <Section title="6. International transfers">
        <p>
          Some providers may process data outside the UK/EEA. Where we do so, we use appropriate safeguards (such as
          standard contractual clauses or equivalent mechanisms) as required by applicable law.
        </p>
      </Section>

      <Section title="7. Retention">
        <p>
          We keep personal data only as long as needed for the purposes above: for example, while your account is active,
          plus a reasonable period for backups, dispute resolution, and legal requirements. You may request deletion of
          your account data (see Your rights); some records may be retained where we must do so by law.
        </p>
      </Section>

      <Section title="8. Cookies and similar technologies">
        <p>
          We use cookies and similar technologies that are necessary for login, security, and core product function.
          Analytics or preference cookies, if used, will be described in-product or via a banner where required. You can
          control cookies through your browser settings; blocking essential cookies may break sign-in or scans.
        </p>
      </Section>

      <Section title="9. Your rights">
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>Access, correct, or delete personal data</li>
          <li>Restrict or object to certain processing</li>
          <li>Receive a portable copy of data you provided</li>
          <li>Withdraw consent where processing is based on consent</li>
          <li>Lodge a complaint with a supervisory authority (in the UK, the ICO)</li>
        </ul>
        <p className="mt-3">
          To exercise these rights, email{" "}
          <a href="mailto:hello@trykob.com" className="font-medium text-[#094413] underline underline-offset-2">
            hello@trykob.com
          </a>
          . We may need to verify your identity before responding.
        </p>
      </Section>

      <Section title="10. Children">
        <p>
          KOB is built for restaurant operators and businesses. We do not knowingly collect personal data from children
          under 16. If you believe we have, contact us and we will delete it promptly.
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update this policy from time to time. The &quot;Last updated&quot; date at the top will change when we
          do. Material changes may also be notified in-product or by email where appropriate.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Privacy questions:{" "}
          <a href="mailto:hello@trykob.com" className="font-medium text-[#094413] underline underline-offset-2">
            hello@trykob.com
          </a>
        </p>
        <p className="mt-3">
          See also our{" "}
          <Link href="/terms" className="font-medium text-[#094413] underline underline-offset-2">
            Terms of Service
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
