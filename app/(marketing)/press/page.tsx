import type { Metadata } from "next";
import Link from "next/link";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { FOUNDING_PRICES } from "@/lib/billing/regional-pricing";
import { BRAND } from "@/lib/marketing/brand-facts";
import { POSTING, POSTING_FAQ } from "@/lib/marketing/feature-status";
import { pageMetadata } from "@/lib/seo/page-metadata";

/**
 * Facts for writers putting KOB in a roundup or quoting us: one place to check what KOB does and doesn't do, the
 * price, and text they can paste. No customer names, logos or counts until someone has agreed to be named.
 */
export const metadata: Metadata = pageMetadata({
  title: "For writers and journalists",
  description:
    "Facts about KOB for writers and journalists: what it does and doesn't do, price, free trial, listing text to paste, and who to contact.",
  path: "/press",
  ownShareImage: true,
});

const price = `${FOUNDING_PRICES.US.label}/mo per location (${FOUNDING_PRICES.GB.label} in the UK)`;

const DOES = [
  POSTING.reviews,
  POSTING.listing,
  "Checks the restaurant's website like a guest would and flags wrong hours, broken links and placeholder text.",
  POSTING.brief,
  POSTING.reviewKit,
];

const DOES_NOT = [
  `${POSTING.control} Angry, sensitive or legal-sounding reviews always wait for the owner.`,
  POSTING_FAQ.a,
  "It doesn't replace a restaurant's ordering, booking system or website. It works alongside them.",
];

const listingText = `${BRAND.listingName}: ${BRAND.longDescription} ${BRAND.trial.label}, then ${price}. ${BRAND.siteUrl}`;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">{title}</h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-[#2c2c2c]/80">{children}</div>
    </section>
  );
}

export default function PressPage() {
  return (
    <>
      <SaasPageHero
        eyebrow="For writers"
        title="For writers and journalists"
        description="Writing about review management or restaurant software? Everything on this page is checked and current, and you're welcome to quote it."
      />
      <SaasSection className="bg-[#fbf8f5] pt-0">
        <div className="mx-auto max-w-3xl">
          <Block title="What KOB is">
            <p>{BRAND.longDescription}</p>
            <p>Built for independent restaurants and cafés with one to five locations.</p>
          </Block>

          <Block title="What it does">
            <ul className="list-disc space-y-2 pl-5">
              {DOES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Block>

          <Block title="What it doesn't do">
            <ul className="list-disc space-y-2 pl-5">
              {DOES_NOT.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Block>

          <Block title="Price and trial">
            <p>
              {BRAND.trial.label}, then {price}. Monthly, no contract. Prices are also on the{" "}
              <Link href="/pricing" className="text-[#088924] underline underline-offset-2">
                pricing page
              </Link>
              .
            </p>
          </Block>

          <Block title="Listing text you can paste">
            <p>For roundups and directories. Please use the name &ldquo;{BRAND.listingName}&rdquo;.</p>
            <blockquote className="rounded-2xl border border-[#2c2c2c]/10 bg-white px-5 py-4 text-[#2c2c2c]" data-testid="listing-text">
              {listingText}
            </blockquote>
            <p className="text-sm">Short version: {BRAND.shortDescription}</p>
          </Block>

          <Block title="Free tools you can link to">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <Link href="/tools/review-time-calculator" className="text-[#088924] underline underline-offset-2">
                  Review reply time calculator
                </Link>
                : an owner&apos;s own numbers in, hours a month out. The formula is on the page.
              </li>
              <li>
                <Link href="/tools/review-reply-templates" className="text-[#088924] underline underline-offset-2">
                  Review reply picker
                </Link>
                : replies by star rating and theme, written to Google&apos;s reply tips.
              </li>
              <li>
                <Link href="/resources" className="text-[#088924] underline underline-offset-2">
                  Guides for restaurant owners
                </Link>
                , with sources for every competitor fact.
              </li>
            </ul>
          </Block>

          <Block title="Contact">
            <p>
              Questions, quotes or logo files:{" "}
              <a href={`mailto:${BRAND.contactEmail}`} className="text-[#088924] underline underline-offset-2">
                {BRAND.contactEmail}
              </a>
              .
            </p>
          </Block>
        </div>
      </SaasSection>
    </>
  );
}
