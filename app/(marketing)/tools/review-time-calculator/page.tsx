import type { Metadata } from "next";
import Link from "next/link";
import { RelatedGuideLinks } from "@/components/marketing/resources/RelatedGuideLinks";
import { SaasPageHero } from "@/components/marketing/saas/SaasPageHero";
import { SaasSection } from "@/components/marketing/saas/SaasSection";
import { ReviewTimeCalculator } from "@/components/marketing/tools/ReviewTimeCalculator";
import { getVisitorFoundingPrice } from "@/lib/billing/visitor-region";
import { BRAND } from "@/lib/marketing/brand-facts";
import { inputsFromQuery } from "@/lib/marketing/tools/review-time";
import { pageMetadata } from "@/lib/seo/page-metadata";

const PATH = "/tools/review-time-calculator";

/** A free tool other guides can link to. ?reviews=&minutes=&locations=&listing= prefill it; the canonical has none. */
export const metadata: Metadata = pageMetadata({
  title: "Review reply time calculator for restaurants",
  description:
    "Work out how many hours a month your restaurant spends replying to reviews and updating hours, menus and listings. Free, using your own numbers.",
  path: PATH,
  ownShareImage: true,
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ReviewTimeCalculatorPage({ searchParams }: Props) {
  const [query, price] = await Promise.all([searchParams, getVisitorFoundingPrice()]);
  const initial = inputsFromQuery(query);
  return (
    <>
      <SaasPageHero
        eyebrow="Free tool"
        title="How long do reviews and listings take you?"
        description="Put in your own numbers. The calculator adds up the time you spend each month replying to reviews and keeping hours, menus and listings right."
      />
      <SaasSection className="bg-[#f9f3ed] pt-0">
        <div className="mx-auto max-w-3xl">
          <ReviewTimeCalculator key={JSON.stringify(initial)} initial={initial} action={PATH} />
          <p className="mt-4 text-sm text-[#2c2c2c]/70">
            The numbers filled in are an example, not an average. Change them to yours.
          </p>

          <section className="mt-12">
            <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">How it works it out</h2>
            <p className="mt-4 text-base leading-relaxed text-[#2c2c2c]/80">
              Hours a month = (reviews a month × minutes per reply + 4.33 × minutes a week on listings × locations) ÷ 60.
            </p>
            <p className="mt-3 text-base leading-relaxed text-[#2c2c2c]/80">
              4.33 is the average number of weeks in a month (52 ÷ 12). Nothing else goes in: no industry average and no
              guess about how much time any tool saves. Negative or blank numbers count as zero.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/70">
              Linking from a guide? You can prefill it, for example{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">{`${BRAND.siteUrl}${PATH}?reviews=40&minutes=6&locations=2&listing=30`}</code>
            </p>
          </section>

          <section className="mt-12 rounded-3xl bg-[#094413] px-6 py-8 text-[#fbf8f5] md:px-8">
            <p className="font-heading text-xl font-semibold">KOB drafts these for you to approve.</p>
            <p className="mt-2 text-sm text-white/80">
              Review replies and listing fixes arrive drafted. You check them, tap once, and post. {BRAND.trial.label}, then{" "}
              {price.label}/mo per location.
            </p>
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/trial" className="inline-flex h-11 items-center rounded-full bg-[#088924] px-6 font-medium text-white hover:bg-[#0aa32c]">
                Try KOB free
              </Link>
              <Link href="/product" className="self-center underline underline-offset-2">
                See what KOB does
              </Link>
              <Link href="/pricing" className="self-center underline underline-offset-2">
                Pricing
              </Link>
            </p>
          </section>

          <RelatedGuideLinks path={PATH} className="mt-10" />
        </div>
      </SaasSection>
    </>
  );
}
