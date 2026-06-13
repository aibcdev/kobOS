import type { Metadata } from "next";
import Link from "next/link";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { ConnectIntegrationCard } from "@/components/dashboard/integrations/ConnectIntegrationCard";
import { SettingsPersonality } from "@/components/dashboard/settings/SettingsPersonality";
import { SettingsRestaurantUrls } from "@/components/dashboard/settings/SettingsRestaurantUrls";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Settings · KOB",
  description: "Integrations and workspace settings.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Settings" description="Integrations and URLs save to the database." />;
  }
  const user = await getDashboardPageUser();
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(user.id, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const integrations = await prisma.integration.findMany({
    where: { restaurantId },
    orderBy: { connectedAt: "desc" },
  });

  const restaurantRow = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { aiPersonality: true, website: true, googleBusinessUrl: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Settings &amp; integrations</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">{restaurant.name}</p>

      <h2 className="type-title-sm mt-10">Connected services</h2>
      <p className="type-body-sm mt-2 text-[var(--color-muted)]">
        Connect analytics, search, and POS to power Traffic &amp; Sales and Customer Insights.
      </p>
      <div className="mt-4 space-y-2">
        {(
          [
            "GOOGLE_ANALYTICS",
            "GOOGLE_SEARCH_CONSOLE",
            "GOOGLE_CALENDAR",
            "GMAIL",
            "SQUARE",
            "TOAST",
            "INSTAGRAM",
            "OPENTABLE",
            "RESY",
          ] as const
        ).map((provider) => (
          <ConnectIntegrationCard
            key={provider}
            restaurantId={restaurantId}
            provider={provider}
            connected={integrations.some((i) => i.provider === provider)}
          />
        ))}
      </div>

      <SettingsRestaurantUrls
        restaurantId={restaurantId}
        website={restaurantRow?.website ?? null}
        googleBusinessUrl={restaurantRow?.googleBusinessUrl ?? null}
      />

      <SettingsPersonality restaurantId={restaurantId} initial={restaurantRow?.aiPersonality ?? "BALANCED"} />

      <div className={`mt-10 ${appCardSurface}`}>
        <p className="type-body-sm text-[var(--color-muted)]">
          Signed in as <span className="font-medium text-[var(--color-ink)]">{user.email ?? "your account"}</span>.
          Team invites and roles ship next.
        </p>
      </div>

      <div className={`mt-6 ${appCardSurface}`}>
        <h2 className="type-title-sm">Brand assets &amp; billing</h2>
        <p className="type-body-sm mt-2 text-[var(--color-muted)]">
          Upload logos and photography from here once the asset pipeline is wired. Subscription and invoices:{" "}
          <Link
            href={`/dashboard/billing?r=${encodeURIComponent(restaurantId)}`}
            className="font-medium text-[var(--color-primary)] underline underline-offset-2"
          >
            Open billing
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
