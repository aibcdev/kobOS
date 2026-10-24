import type { Metadata } from "next";
import { BillingActions } from "@/components/dashboard/billing/BillingActions";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { appCardSurface } from "@/lib/app-ui-classes";
import { priceForCountry } from "@/lib/billing/regional-pricing";
import { getStripe } from "@/lib/billing/stripe-server";
import { trialState } from "@/lib/billing/trial";
import { currencyForCountry } from "@/lib/commerce/currency";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";

export const metadata: Metadata = {
  title: "Billing · KOB",
  description: "Your free trial, your price and your card.",
};

const day = (d: Date, timeZone: string) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone });

/** The next charge, read from Stripe when a card is on file; null when it can't be read. */
async function nextCharge(subscriptionId: string | null): Promise<Date | null> {
  const stripe = getStripe();
  if (!stripe || !subscriptionId) return null;
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    // Older API versions put the period end on the subscription, newer ones on the item.
    const item = sub.items.data[0] as unknown as { current_period_end?: number } | undefined;
    const end = sub.trial_end ?? (sub as unknown as { current_period_end?: number }).current_period_end ?? item?.current_period_end;
    return end ? new Date(end * 1000) : null;
  } catch {
    return null;
  }
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ r?: string; checkout?: string }> }) {
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const price = priceForCountry(restaurant.countryCode);
  const local = currencyForCountry(restaurant.countryCode);
  const converted = local.toLowerCase() !== price.currency ? ` Charged in ${price.currency.toUpperCase()}; your bank converts it to ${local}.` : "";
  const state = trialState(restaurant);
  const tz = restaurant.timezone;
  const cardsOn = Boolean(getStripe());
  const charge = state.kind === "active" || state.kind === "past_due" ? await nextCharge(restaurant.stripeSubscriptionId) : null;

  const status = (() => {
    switch (state.kind) {
      case "trialing":
        return {
          title: `Free trial · ${state.daysLeft} day${state.daysLeft === 1 ? "" : "s"} left`,
          body: `Your trial ends ${day(state.endsAt, tz)}. After that it's ${price.label} a month per location.${converted} There's no card on file, so nothing will be charged unless you add one.`,
          action: "add_card" as const,
        };
      case "ended":
        return {
          title: "Your free trial has ended",
          body: `It ended ${day(state.endedAt, tz)}. KOB is paused: your data is kept, but nothing new is drafted or published. Add a card to pick up where you left off — ${price.label} a month per location.${converted}`,
          action: "add_card" as const,
        };
      case "active":
        return {
          title: `${price.label} a month per location`,
          body: `Card on file.${charge ? ` Next charge ${day(charge, tz)}.` : ""}${converted} Cancel any time.`,
          action: "manage" as const,
        };
      case "past_due":
        return { title: "Your last payment didn't go through", body: "Update your card to keep KOB running.", action: "manage" as const };
      case "canceled":
        return { title: "Your plan is cancelled", body: `Restart any time — ${price.label} a month per location.${converted}`, action: "add_card" as const };
      default:
        return { title: `${price.label} a month per location`, body: `Add a card to run KOB for ${restaurant.name}.${converted}`, action: "add_card" as const };
    }
  })();

  return (
    <div className="mx-auto max-w-3xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Billing</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">{restaurant.name}</p>

      {sp.checkout === "success" ? (
        <div className={`mt-6 ${appCardSurface} border-emerald-200 bg-emerald-50`}>
          <p className="type-body-sm text-emerald-900">Card added. Thank you.</p>
        </div>
      ) : null}

      <div className={`mt-8 ${appCardSurface}`}>
        <h2 className="type-title-sm">{status.title}</h2>
        <p className="type-body-sm mt-2 text-[var(--color-muted)]">{status.body}</p>
        <div className="mt-6">
          <BillingActions restaurantId={restaurantId} action={status.action} priceLabel={price.label} cardsOn={cardsOn} />
        </div>
      </div>
    </div>
  );
}
