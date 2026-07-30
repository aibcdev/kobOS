import type { Metadata } from "next";
import Link from "next/link";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { withRestaurantQuery } from "@/lib/dashboard/nav";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Marketing · KOB",
  description: "Demand, SEO, social, email, and campaigns.",
};

const HUB_LINKS = [
  { href: "/dashboard/demand-engine", label: "Demand Engine", hint: "Offers that fill quiet times" },
  { href: "/dashboard/seo", label: "Local SEO", hint: "Search visibility" },
  { href: "/dashboard/listings", label: "Google Presence", hint: "Profile and photos" },
  { href: "/dashboard/content", label: "Social", hint: "Posts and creative" },
  { href: "/dashboard/creative", label: "Email & SMS", hint: "Campaigns and sequences" },
  { href: "/dashboard/ordering", label: "Online Ordering", hint: "Checkout and upsells" },
] as const;

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Marketing" description="Campaigns list loads from the database." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const campaigns = await prisma.campaign.findMany({
    where: { restaurantId },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Marketing</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Demand, SEO, social, and campaigns for {restaurant.name}.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {HUB_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={withRestaurantQuery(link.href, restaurantId)}
              className={`block no-underline ${appCardSurface} transition-colors hover:border-[var(--color-ink)]/20`}
            >
              <p className="type-title-sm text-[var(--color-ink)]">{link.label}</p>
              <p className="type-caption mt-1 text-[var(--color-muted)]">{link.hint}</p>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="type-title-sm mt-12">Campaigns</h2>
      {campaigns.length === 0 ? (
        <p className={`type-body-sm mt-4 text-[var(--color-muted)] ${appCardSurface}`}>
          No campaigns yet. Create drafts from Demand Engine or Email & SMS.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {campaigns.map((c) => (
            <li key={c.id} className={appCardSurface}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="type-caption text-[var(--color-muted-medium)]">{c.channel.replace(/_/g, " ")}</span>
                <span className="type-caption font-medium text-[var(--color-ink)]">{c.status}</span>
              </div>
              <p className="type-title-sm mt-2">{c.title}</p>
              <p className="type-caption mt-1 text-[var(--color-muted-medium)]">
                {c.type.replace(/_/g, " ")}
                {c.scheduledAt ? ` · scheduled ${c.scheduledAt.toLocaleDateString()}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
