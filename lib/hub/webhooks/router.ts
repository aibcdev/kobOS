import { Prisma, type IntegrationProvider } from "@prisma/client";
import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db/prisma";
import { minimisePayload } from "@/lib/hub/webhooks/minimise";
import type { ParsedEvent, Verifier, WebhookRequest } from "@/lib/hub/webhooks/types";
import { verifierFor } from "@/lib/hub/webhooks/verifiers";

export const WEBHOOK_EVENT = "hub/webhook.received";

/** URLs a provider may have signed: the configured public URL first, then the forwarded and raw request URLs. */
export function signedUrlCandidates(req: Request, provider: string): string[] {
  const url = new URL(req.url);
  const out = new Set<string>();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site) out.add(`${site}${url.pathname}${url.search}`);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  if (host) out.add(`${proto}://${host}${url.pathname}${url.search}`);
  out.add(url.toString());
  const override = process.env[`${provider.toUpperCase().replace(/-/g, "_")}_WEBHOOK_URL`]?.trim();
  return override ? [override, ...out] : [...out];
}

async function resolveTenant(v: Verifier, e: ParsedEvent): Promise<{ restaurantId: string | null; integrationId: string | null }> {
  if (e.restaurantId) {
    const integration = v.integrationProvider
      ? await prisma.integration.findUnique({
          where: { restaurantId_provider: { restaurantId: e.restaurantId, provider: v.integrationProvider } },
          select: { id: true },
        })
      : null;
    return { restaurantId: e.restaurantId, integrationId: integration?.id ?? null };
  }
  if (!e.accountId || !v.integrationProvider) return { restaurantId: null, integrationId: null };
  const integration = await prisma.integration.findFirst({
    where: { provider: v.integrationProvider as IntegrationProvider, externalAccountId: e.accountId, status: { not: "DISCONNECTED" } },
    select: { id: true, restaurantId: true },
  });
  return { restaurantId: integration?.restaurantId ?? null, integrationId: integration?.id ?? null };
}

/** Stores one event; returns its id, or null when it was a duplicate. */
async function store(v: Verifier, e: ParsedEvent): Promise<string | null> {
  const tenant = await resolveTenant(v, e);
  // ON CONFLICT DO NOTHING: a redelivery returns no row instead of raising (and logging) a unique violation.
  const [row] = await prisma.connectorEvent.createManyAndReturn({
    data: [
      {
        provider: v.provider,
        externalId: e.externalId.slice(0, 500),
        type: e.type.slice(0, 200),
        payloadJson: minimisePayload(e.payload) as Prisma.InputJsonValue,
        ...tenant,
        status: tenant.restaurantId ? "RECEIVED" : "IGNORED",
        error: tenant.restaurantId ? null : "no_tenant",
      },
    ],
    skipDuplicates: true,
    select: { id: true, status: true },
  });
  return row?.status === "RECEIVED" ? row.id : null;
}

/**
 * Spec 2 §3.9: raw body → verifier → tenant → ConnectorEvent (deduped) → inngest → 200. Processing happens in
 * `kob-hub-webhook-process`; nothing slow runs before the ack. Unknown tenants are kept as IGNORED for replay.
 */
export async function handleWebhook(req: Request, provider: string, key?: string): Promise<Response> {
  const v = verifierFor(provider);
  if (!v) return new Response("Unknown provider", { status: 404 });
  const raw = await req.text();
  const outcome = await v.verify({ raw, headers: req.headers, urls: signedUrlCandidates(req, provider), key, now: new Date() } satisfies WebhookRequest);
  if (!outcome.ok) {
    console.warn(`[webhooks] ${provider} rejected: ${outcome.reason}`);
    return new Response(outcome.status === 503 ? "Not configured" : "Unauthorized", { status: outcome.status });
  }

  const fresh: string[] = [];
  for (const e of outcome.events) {
    const id = await store(v, e);
    if (id) fresh.push(id);
  }
  if (fresh.length) {
    try {
      await inngest.send(fresh.map((eventId) => ({ name: WEBHOOK_EVENT, data: { eventId } })));
    } catch (err) {
      // Stored as RECEIVED; the hub-webhook-sweep cron re-sends anything left unprocessed.
      console.warn(`[webhooks] ${provider} enqueue failed`, err instanceof Error ? err.message : err);
    }
  }
  const r = outcome.response;
  return new Response(r?.body ?? (r ? "" : "ok"), { status: r?.status ?? 200, headers: r?.headers });
}
