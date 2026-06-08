import type { Metadata } from "next";
import Link from "next/link";
import { BillingActions } from "@/components/dashboard/billing/BillingActions";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { planLabel } from "@/lib/billing/plan-access";
import { getStripe } from "@/lib/billing/stripe-server";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Billing · KOB",
  description: "Subscriptions and invoices.",
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ r?: string; checkout?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Billing" description="Stripe checkout and invoices need a live backend and keys." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const stripeReady = Boolean(
    getStripe() &&
      process.env.STRIPE_PRICE_STARTER?.trim() &&
      process.env.STRIPE_PRICE_PRO?.trim(),
  );

  return (
    <div className="mx-auto max-w-3xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Billing</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">{restaurant.name}</p>

      {sp.checkout === "success" ? (
        <div className={`mt-6 ${appCardSurface} border-emerald-200 bg-emerald-50`}>
          <p className="type-body-sm text-emerald-900">Trial started — check today&apos;s task list.</p>
          <Link
            href={`/dashboard?r=${encodeURIComponent(restaurantId)}&welcome=1`}
            className="mt-3 inline-block font-semibold text-[var(--color-primary)] underline underline-offset-2"
          >
            Go to Today →
          </Link>
        </div>
      ) : null}

      <div className={`mt-8 ${appCardSurface}`}>
        <p className="type-body-sm text-[var(--color-muted)]">
          Current plan: <span className="font-semibold text-[var(--color-ink)]">{planLabel(restaurant.subscriptionPlan)}</span>
          {restaurant.stripeSubscriptionId ? (
            <span className="type-caption block pt-2 text-[var(--color-muted-medium)]">
              Subscription on file — use Manage billing to change payment method or cancel.
            </span>
          ) : null}
        </p>
        <div className="mt-6">
          <BillingActions
            restaurantId={restaurantId}
            hasStripeCustomer={Boolean(restaurant.stripeCustomerId)}
            stripeReady={stripeReady}
          />
        </div>
      </div>

      <div className={`mt-6 ${appCardSurface}`}>
        <h2 className="type-title-sm">Plan map</h2>
        <ul className="type-body-sm mt-3 list-disc space-y-2 pl-5 text-[var(--color-muted)]">
          <li>
            <strong className="text-[var(--color-ink)]">Free</strong> — daily Growth briefing, up to 3 SEO keywords, read-only dashboards.
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">Starter</strong> — AI food &amp; brand studio, website strategist, smart review replies, SEO refresh tools.
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">Pro</strong> — everything in Starter plus outbound acquisition drafts with human approval queue.
          </li>
        </ul>
      </div>
    </div>
  );
}
