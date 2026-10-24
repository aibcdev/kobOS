import { redirect } from "next/navigation";
import { AppPageShell } from "@/components/actions/app-page-shell";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { periodStart, reviewSummary } from "@/lib/kob/talk/restaurant-facts";
import { googleReviewLink, reviewAskMessage, reviewQrSvg } from "@/lib/reviews/review-kit";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await loadOwnerContext(params.r);
  if (ctx.kind === "signed-out") redirect("/login?next=%2Fapp%2Freviews");
  if (ctx.kind === "no-restaurant") redirect("/app");
  const restaurantQuery = typeof params.r === "string" ? `?r=${encodeURIComponent(params.r)}` : "";
  const { id, name, timezone } = ctx.restaurant;

  const now = new Date();
  const weekStart = periodStart("week", timezone, now);
  const [link, thisWeek, lastWeek] = await Promise.all([
    googleReviewLink(id),
    reviewSummary(id, weekStart, now),
    reviewSummary(id, new Date(weekStart.getTime() - 7 * 86_400_000), weekStart),
  ]);
  const kit = (format: string) => `/api/reviews/kit?restaurantId=${encodeURIComponent(id)}&format=${format}`;

  return (
    <AppPageShell title="Reviews" subtitle={name} restaurantQuery={restaurantQuery} active="/app/reviews">
      <section className="rounded-3xl border border-line bg-paper p-5">
        <p className="text-sm text-muted">This week</p>
        <p className="mt-1 font-display text-4xl">{thisWeek.count}</p>
        <p className="mt-1 text-sm text-muted">
          new review{thisWeek.count === 1 ? "" : "s"} · last week {lastWeek.count} · {thisWeek.unrepliedTotal} waiting for a reply
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Get more reviews from happy guests</h2>
        {link ? (
          <>
            <div className="flex flex-wrap items-center gap-5 rounded-3xl border border-line bg-paper p-5">
              {/* The SVG is generated on the server from our own link. */}
              <div className="h-32 w-32" dangerouslySetInnerHTML={{ __html: await reviewQrSvg(link.url) }} />
              <div className="space-y-2 text-sm">
                <p>Guests scan this to land straight on your Google review form.</p>
                <div className="flex flex-wrap gap-2">
                  <a href={kit("card")} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-espresso px-4 text-paper">
                    Print table cards
                  </a>
                  <a href={kit("qr")} className="inline-flex min-h-11 items-center rounded-full border border-line px-4">
                    Download QR code
                  </a>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-line bg-paper p-5 text-sm">
              <p className="font-medium">A thank-you to send after a visit</p>
              <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-bone p-3">{reviewAskMessage(name, link.url, "sms").body}</p>
              <p className="mt-2 text-muted">
                Only send it to guests who&apos;ve said you can contact them. Never offer anything in return for a review.
              </p>
            </div>
          </>
        ) : (
          <p className="rounded-3xl border border-dashed border-line bg-paper p-5 text-sm">
            Connect your Google listing in Connections (or run the free check) so KOB knows which listing to send guests to.
          </p>
        )}
      </section>
    </AppPageShell>
  );
}
