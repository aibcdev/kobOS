import type { Integration, SyncCursor } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getManifest } from "@/lib/hub/manifest";
import { connectorEnabled } from "@/lib/hub/sync/scheduler";

/** Spec 2 §3.11. REAUTH and DISCONNECTED are set by the token service / owner and only cleared by reconnecting. */
export type HealthStatus = "CONNECTED" | "DEGRADED" | "REAUTH" | "DISCONNECTED" | "PENDING_APPROVAL";

export const DEGRADED_AFTER_FAILURES = 3;

export function computeHealth(input: {
  integration: Pick<Integration, "status">;
  cursors: Pick<SyncCursor, "failureCount">[];
  enabled: boolean;
  lastWebhookAt?: Date | null;
  expectedSilenceHours?: number;
  now: Date;
}): HealthStatus {
  const s = input.integration.status;
  if (s === "REAUTH" || s === "DISCONNECTED") return s;
  if (!input.enabled) return "PENDING_APPROVAL";
  if (input.cursors.some((c) => c.failureCount >= DEGRADED_AFTER_FAILURES)) return "DEGRADED";
  if (input.expectedSilenceHours && input.lastWebhookAt && input.now.getTime() - input.lastWebhookAt.getTime() > input.expectedSilenceHours * 3_600_000) {
    return "DEGRADED";
  }
  return "CONNECTED";
}

/** Recomputes and stores one integration's status; returns it. Integrations without a manifest are left alone. */
export async function refreshHealth(integrationId: string, now = new Date()): Promise<HealthStatus | null> {
  const integration = await prisma.integration.findUnique({ where: { id: integrationId }, include: { syncCursors: true } });
  if (!integration) return null;
  const manifest = getManifest(integration.provider);
  if (!manifest) return null;
  const lastWebhook = manifest.webhooks?.expectedSilenceHours
    ? await prisma.connectorEvent.findFirst({ where: { integrationId }, orderBy: { receivedAt: "desc" }, select: { receivedAt: true } })
    : null;
  const status = computeHealth({
    integration,
    cursors: integration.syncCursors,
    enabled: await connectorEnabled(manifest, integration.restaurantId),
    lastWebhookAt: lastWebhook?.receivedAt ?? null,
    expectedSilenceHours: manifest.webhooks?.expectedSilenceHours,
    now,
  });
  await prisma.integration.update({ where: { id: integrationId }, data: { status, lastHealthAt: now } });
  return status;
}
