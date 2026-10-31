import type { Metadata } from "next";
import Link from "next/link";
import { RelatedGuideLinks } from "@/components/marketing/resources/RelatedGuideLinks";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { CopyButton, ReplyTemplatePicker } from "@/components/marketing/tools/ReplyTemplatePicker";
import { POSTING } from "@/lib/marketing/feature-status";
import { REPLY_TEMPLATE_SOURCE, REPLY_TEMPLATES, THEME_LABELS } from "@/lib/marketing/tools/reply-templates";
import { pageMetadata } from "@/lib/seo/page-metadata";

const PATH = "/tools/review-reply-templates";

/**
 * The interactive picker. The guide at /resources/restaurant-review-reply-templates owns the "review reply templates"
 * query; this page targets the picker and links back to it.
 */
export const metadata: Metadata = pageMetadata({
  title: "Review reply picker for restaurants",
  description:
    "Pick a star rating and what the review is about, then copy a reply to adapt with the guest's name and one detail. Free, with nothing to sign up for.",
  path: PATH,
  ownShareImage: true,
});

const STARS = [5, 4, 3, 2, 1] as const;

export default function ReviewReplyTemplatesPage() {
  return (
    <>
      <SaasPageHero
        eyebrow="Free tool"
        title="Pick a review, get a reply to adapt"
        description="Choose the star rating and what the guest wrote about. Copy the reply, swap in their name and one detail from the review, and post it yourself."
      />
      <SaasSection className="bg-[#f9f3ed] pt-0">
        <div className="mx-auto max-w-3xl">
          <ReplyTemplatePicker />
          <p className="mt-4 text-sm text-[#2c2c2c]/70">
            Replace {"{guestName}"}, {"{dishOrDetail}"} and {"{managerName}"}, and anything in [square brackets]. Change
            at least one line so it&apos;s clearly about this guest. For why, read{" "}
            <Link href="/resources/restaurant-review-reply-templates" className="text-[#088924] underline underline-offset-2">
              the full guide to review reply templates
            </Link>
            .
          </p>

          <section className="mt-12">
            <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">Every reply, by star rating</h2>
            <div className="mt-6 space-y-3">
              {STARS.map((stars) => (
                <details key={stars} className="rounded-2xl border border-[#2c2c2c]/10 bg-white px-5 py-4" open={stars === 1}>
                  <summary className="cursor-pointer font-heading text-lg font-semibold text-[#2c2c2c]">{stars}★ reviews</summary>
                  <ul className="mt-4 space-y-5">
                    {REPLY_TEMPLATES.filter((t) => t.stars === stars).map((t) => (
                      <li key={t.id} id={t.id}>
                        <h3 className="text-sm font-semibold text-[#094413]">{THEME_LABELS[t.theme]}</h3>
                        <p className="mt-1 text-sm text-[#2c2c2c]/70">{t.note}</p>
                        <p className="mt-2 text-base leading-relaxed text-[#2c2c2c]">{t.text}</p>
                        <div className="mt-3">
                          <CopyButton text={t.text} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">How these were written</h2>
            <p className="mt-4 text-base leading-relaxed text-[#2c2c2c]/80">
              Each reply follows Google&apos;s own tips: be polite and short, mention what the guest actually said,
              apologise when it&apos;s due, and keep it conversational rather than promotional. Complaints are taken
              offline. None offers a discount or anything else for a review, which Google prohibits.
            </p>
            <p className="mt-3 text-sm">
              Source:{" "}
              <a href={REPLY_TEMPLATE_SOURCE.href} rel="noopener" target="_blank" className="text-[#088924] underline underline-offset-2">
                {REPLY_TEMPLATE_SOURCE.label}
              </a>
            </p>
          </section>

          <section className="mt-12 rounded-3xl bg-[#094413] px-6 py-8 text-[#fbf8f5] md:px-8">
            <p className="font-heading text-xl font-semibold">Rather not write them yourself?</p>
            <p className="mt-2 text-sm text-white/80">{POSTING.reviews}</p>
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/trial" className="inline-flex h-11 items-center rounded-full bg-[#088924] px-6 font-medium text-white hover:bg-[#0aa32c]">
                Try KOB free
              </Link>
              <Link href="/tools/review-time-calculator" className="self-center underline underline-offset-2">
                How long do replies take you?
              </Link>
            </p>
          </section>

          <RelatedGuideLinks path={PATH} className="mt-10" />
        </div>
      </SaasSection>
    </>
  );
}
