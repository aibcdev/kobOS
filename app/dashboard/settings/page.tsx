import type { Metadata } from "next";
import Link from "next/link";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
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
      {integrations.length === 0 ? (
        <p className={`type-body-sm mt-4 text-[var(--color-muted)] ${appCardSurface}`}>
          No integrations yet. Use <span className="font-mono text-[13px]">POST /api/integrations</span> or the Growth
          onboarding flow when available.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {integrations.map((i) => (
            <li key={i.id} className={appCardSurface}>
              <p className="font-medium text-[var(--color-ink)]">{i.provider.replace(/_/g, " ")}</p>
              <p className="type-caption text-[var(--color-muted-medium)]">Connected {i.connectedAt.toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}

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
