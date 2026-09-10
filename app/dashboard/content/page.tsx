import type { Metadata } from "next";
import Link from "next/link";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { RequestServiceButton } from "@/components/dashboard/RequestServiceButton";
import { appCardSurface } from "@/lib/app-ui-classes";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { catalogItem, includedWithPlan } from "@/lib/credits/catalog";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Social Media Content · KOB",
  description: "Request human-made text, image, and video drafts.",
};

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const types = ["SOCIAL_TEXT", "SOCIAL_IMAGES", "SOCIAL_VIDEO"] as const;
  const requests = await prisma.serviceRequest.findMany({
    where: { restaurantId, type: { in: [...types] } },
    orderBy: { createdAt: "desc" },
    include: { drafts: { orderBy: { draftNumber: "asc" } } },
    take: 20,
  });
  const openByType = new Map(
    requests
      .filter((r) => !["APPROVED", "DELIVERED", "CANCELLED"].includes(r.status))
      .map((r) => [r.type, r.status]),
  );
  const paid = planMeetsMinimum(restaurant.subscriptionPlan, "STARTER");

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Social Media Content</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Click Request. Our team creates three drafts for {restaurant.name} and emails you when they are ready.
      </p>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {types.map((type) => {
          const item = catalogItem(type)!;
          const included = includedWithPlan(type, restaurant.subscriptionPlan);
          return (
            <section key={type} className={appCardSurface}>
              <h2 className="type-title-sm">{item.title}</h2>
              <p className="type-body-sm mt-2 min-h-14 text-[var(--color-muted)]">{item.description}</p>
              <p className="type-caption mt-3 font-semibold text-[var(--color-ink)]">
                {included ? "Included in Pro" : `${item.creditCost} credits after approval`}
              </p>
              <RequestServiceButton
                restaurantId={restaurantId}
                type={type}
                title={item.title}
                creditCost={included ? 0 : item.creditCost}
                isPaid={paid}
                billingHref={`/dashboard/billing?r=${encodeURIComponent(restaurantId)}&tier=starter`}
                openStatus={openByType.get(type)}
                label="Request"
                className="mt-4"
              />
            </section>
          );
        })}
      </div>

      <h2 className="type-title-sm mt-10">Your requests</h2>
      {requests.length === 0 ? (
        <p className={`type-body-sm mt-3 text-[var(--color-muted)] ${appCardSurface}`}>Nothing requested yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {requests.map((request) => (
            <li key={request.id} className={appCardSurface}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">{request.title}</p>
                  <p className="type-caption mt-1 text-[var(--color-muted)]">
                    {request.status.replace(/_/g, " ")}
                  </p>
                </div>
                {request.drafts.length ? (
                  <Link
                    href={`/preview/service/${request.drafts[0]!.previewToken}`}
                    className="font-semibold text-[var(--color-primary)] underline underline-offset-2"
                  >
                    View 3 drafts
                  </Link>
                ) : (
                  <span className="type-caption text-[var(--color-muted)]">We are working on it</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
