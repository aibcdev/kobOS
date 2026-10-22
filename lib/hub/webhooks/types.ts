import type { IntegrationProvider } from "@prisma/client";

export type WebhookRequest = {
  raw: string;
  headers: Headers;
  /** URLs the provider may have signed (configured public URL first, then what the request says). */
  urls: string[];
  /** Extra path segment: per-venue secret for Purple/Deputy-style listeners. */
  key?: string;
  now: Date;
};

export type ParsedEvent = {
  /** Provider event id, unique per provider: the dedupe key. */
  externalId: string;
  type: string;
  payload: unknown;
  /** merchant_id / account / tenantId / realmId, matched against Integration.externalAccountId. */
  accountId?: string | null;
  /** When the verifier already knows the tenant (per-venue secret paths). */
  restaurantId?: string | null;
};

export type VerifyOutcome =
  | { ok: true; events: ParsedEvent[]; response?: { status?: number; headers?: Record<string, string>; body?: string } }
  | { ok: false; status: 400 | 401 | 503; reason: string };

export type Verifier = {
  /** ConnectorEvent.provider, also the URL segment: /api/webhooks/<provider>. */
  provider: string;
  /** Integration whose externalAccountId identifies the tenant. */
  integrationProvider?: IntegrationProvider;
  verify(req: WebhookRequest): VerifyOutcome | Promise<VerifyOutcome>;
};
