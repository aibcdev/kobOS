import type { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { capabilitiesFor, FEATURES, type CapabilityState, type FeatureKey } from "@/lib/hub/capabilities";
import { flagDefault, FLAGS, type FlagName } from "@/lib/flags";
import { allManifests } from "@/lib/hub/manifest";

const isFlagName = (name: string): name is FlagName => (FLAGS as readonly string[]).includes(name);

/** Spec 2 §3.12 ops view: fleet-wide connector health and LIVE / PARTIAL / OFF per feature. Operators only (app/ops/layout.tsx). */

export type FeatureTally = { feature: FeatureKey; label: string } & Record<CapabilityState, number>;

/** Pure: counts each feature's state across restaurants. */
export function tallyCapabilities(perRestaurant: { feature: FeatureKey; state: CapabilityState }[][]): FeatureTally[] {
  return (Object.keys(FEATURES) as FeatureKey[]).map((feature) => {
    const t: FeatureTally = { feature, label: FEATURES[feature].label, LIVE: 0, PARTIAL: 0, OFF: 0 };
    for (const caps of perRestaurant) {
      const c = caps.find((x) => x.feature === feature);
      if (c) t[c.state] += 1;
    }
    return t;
  });
}

/** Restaurants sampled for the feature table: most recently active hub users. Bounded so the page stays fast. */
const FEATURE_SAMPLE = 100;
const DAY_MS = 86_400_000;

export async function opsConnectorsView(now = new Date()) {
  const providers = allManifests()
    .filter((m) => m.auth.kind !== "PLATFORM_KEY")
    .map((m) => m.provider);

  const [byStatus, attention, events, failedImports, active] = await Promise.all([
    prisma.integration.groupBy({ by: ["provider", "status"], where: { provider: { in: providers as IntegrationProvider[] } }, _count: { _all: true } }),
    prisma.integration.findMany({
      where: {
        provider: { in: providers as IntegrationProvider[] },
        OR: [{ status: { in: ["DEGRADED", "REAUTH"] } }, { syncCursors: { some: { failureCount: { gt: 0 } } } }],
      },
      include: { restaurant: { select: { name: true } }, syncCursors: { where: { failureCount: { gt: 0 } } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.connectorEvent.groupBy({
      by: ["provider", "status"],
      where: { receivedAt: { gte: new Date(now.getTime() - DAY_MS) } },
      _count: { _all: true },
    }),
    prisma.importJob.findMany({
      where: { status: "FAILED", createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
      include: { restaurant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.integration.findMany({
      where: { provider: { in: providers as IntegrationProvider[] }, status: { not: "DISCONNECTED" } },
      select: { restaurantId: true },
      distinct: ["restaurantId"],
      orderBy: { updatedAt: "desc" },
      take: FEATURE_SAMPLE,
    }),
  ]);

  const manifests = allManifests().filter((m) => m.auth.kind !== "PLATFORM_KEY");
  const overrides = await prisma.featureFlagOverride.groupBy({
    by: ["name", "enabled"],
    where: { name: { in: manifests.map((m) => m.approval.flag) } },
    _count: { _all: true },
  });
  const rollout = manifests.map((m) => ({
    provider: m.provider,
    displayName: m.displayName,
    flag: m.approval.flag,
    globallyOn: isFlagName(m.approval.flag) && flagDefault(m.approval.flag),
    restaurantsOn: overrides.find((o) => o.name === m.approval.flag && o.enabled)?._count._all ?? 0,
  }));

  const statusCounts = rollout.map((r) => {
    const counts: Record<string, number> = {};
    for (const row of byStatus) if (row.provider === r.provider) counts[row.status] = row._count._all;
    const webhooks: Record<string, number> = {};
    for (const row of events) if (row.provider === r.provider) webhooks[row.status] = row._count._all;
    return { ...r, counts, webhooks };
  });

  const perRestaurant = await Promise.all(
    active.map(({ restaurantId }) => capabilitiesFor(restaurantId)),
  );

  return {
    providers: statusCounts,
    attention: attention.map((i) => ({
      id: i.id,
      provider: i.provider,
      restaurant: i.restaurant.name,
      restaurantId: i.restaurantId,
      status: i.status,
      lastErrorCode: i.lastErrorCode,
      lastSuccessAt: i.lastSuccessAt,
      failing: i.syncCursors.map((c) => ({ stream: c.stream, failureCount: c.failureCount, lastError: c.lastError })),
    })),
    failedImports: failedImports.map((j) => ({
      id: j.id,
      restaurant: j.restaurant.name,
      source: j.source,
      createdAt: j.createdAt,
      error: Array.isArray(j.errorsJson) ? String((j.errorsJson[0] as { message?: unknown } | undefined)?.message ?? "") : "",
    })),
    features: tallyCapabilities(perRestaurant),
    sampled: perRestaurant.length,
  };
}
