import { prisma } from "@/lib/db/prisma";
import { connectorFor } from "@/lib/hub/connector";
import { connectorCtx } from "@/lib/hub/ctx";
import { verifierFor } from "@/lib/hub/webhooks/verifiers";

export type ProcessOutcome = "processed" | "ignored" | "skipped";

/**
 * Runs the connector's `handleWebhook` for one stored event. Idempotent: PROCESSED/IGNORED rows are skipped.
 * Errors are recorded on the row and rethrown so Inngest retries.
 */
export async function processConnectorEvent(eventId: string): Promise<ProcessOutcome> {
  const event = await prisma.connectorEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status === "PROCESSED" || event.status === "IGNORED") return "skipped";

  const provider = verifierFor(event.provider)?.integrationProvider;
  const connector = provider ? connectorFor(provider) : undefined;
  const integration = event.integrationId ? await prisma.integration.findUnique({ where: { id: event.integrationId } }) : null;
  if (!connector?.handleWebhook || !integration) {
    await prisma.connectorEvent.update({
      where: { id: event.id },
      data: { status: "IGNORED", processedAt: new Date(), error: !integration ? "no_integration" : "no_handler" },
    });
    return "ignored";
  }
  try {
    await connector.handleWebhook(connectorCtx(integration), event);
    await prisma.connectorEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), error: null } });
    await prisma.integration.update({ where: { id: integration.id }, data: { lastSuccessAt: new Date() } });
    return "processed";
  } catch (e) {
    await prisma.connectorEvent.update({
      where: { id: event.id },
      data: { status: "FAILED", error: (e instanceof Error ? e.message : String(e)).slice(0, 500) },
    });
    throw e;
  }
}

/** RECEIVED events older than `olderThanMs` that were never picked up (the enqueue after storing failed). */
export async function staleEventIds(now = new Date(), olderThanMs = 5 * 60_000, limit = 200): Promise<string[]> {
  const rows = await prisma.connectorEvent.findMany({
    where: { status: "RECEIVED", receivedAt: { lt: new Date(now.getTime() - olderThanMs), gt: new Date(now.getTime() - 3 * 86_400_000) } },
    orderBy: { receivedAt: "asc" },
    take: limit,
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
