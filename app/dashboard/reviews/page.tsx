import type { Metadata } from "next";
import { ReviewsRelationshipPanel } from "@/components/dashboard/reviews/ReviewsRelationshipPanel";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { RequestServiceButton } from "@/components/dashboard/RequestServiceButton";
import { appCardSurface } from "@/lib/app-ui-classes";
import { prisma } from "@/lib/db/prisma";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { getServiceRequestSurfaceState } from "@/lib/dashboard/service-request-surface";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Reviews & Relationships · KOB",
  description: "Smart replies, reviewer CRM, and reputation trends.",
};

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Reviews" description="Review inbox and replies load from Postgres." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const reviews = await prisma.customerReview.findMany({
    where: { restaurantId },
    orderBy: { reviewedAt: "desc" },
    take: 25,
    select: { id: true, rating: true, body: true, reviewerName: true, reviewedAt: true, replied: true },
  });

  const reviewItems = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    reviewerName: r.reviewerName,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    replied: r.replied,
  }));

  const reviewsSurface = await getServiceRequestSurfaceState(
    restaurantId,
    restaurant.subscriptionPlan,
    "REVIEWS",
  );

  return (
    <div className="mx-auto max-w-5xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Reviews &amp; reviewer relationships</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Smart replies and relationship ideas for {restaurant.name}. Drafts use your workspace tone and reviewer notes
        when available.
      </p>

      <div className={`mt-6 ${appCardSurface}`}>
        <p className="type-label-md text-[var(--color-ink)]">Need a full reviews engine setup?</p>
        <p className="type-body-sm mt-1 text-[var(--color-muted)]">
          Request it — status becomes Requested and our team picks up the ticket.
        </p>
        <div className="mt-3">
          <RequestServiceButton
            restaurantId={restaurantId}
            type="REVIEWS"
            title="Reviews engine"
            creditCost={reviewsSurface.creditCost}
            isPaid={reviewsSurface.isPaid}
            billingHref={`/dashboard/billing?r=${encodeURIComponent(restaurantId)}&tier=starter`}
            openStatus={reviewsSurface.openStatus}
            label="Request reviews setup"
          />
        </div>
      </div>

      <div className="mt-10">
        <ReviewsRelationshipPanel restaurantId={restaurantId} reviews={reviewItems} />
      </div>

      <div className={`mt-8 ${appCardSurface}`}>
        <h2 className="type-title-sm">Reputation trends</h2>
        <p className="type-body-sm mt-2 text-[var(--color-muted)]">
          Spike alerts and campaigns tie into Growth Agent on Today. CRM fields for power reviewers live in Settings
          over time.
        </p>
      </div>
    </div>
  );
}
