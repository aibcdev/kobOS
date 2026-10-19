import { Prisma, type Integration, type IntegrationProvider, type SyncCursor } from "@prisma/client";
import { inngest } from "@/inngest/client";
import { registerAllConnectors } from "@/lib/connectors";
import { prisma } from "@/lib/db/prisma";
import { encryptKeyFields, readKeyFields } from "@/lib/hub/auth/api-key";
import { capabilitiesFor, capabilityHint, providerName, regionFor, type Capability } from "@/lib/hub/capabilities";
import { connectorFor } from "@/lib/hub/connector";
import { connectorCtx } from "@/lib/hub/ctx";
import { allManifests, getManifest, type ConnectorCategory, type ConnectorManifest, type DataContract, type Region } from "@/lib/hub/manifest";
import { importSource } from "@/lib/hub/imports/sources";
import { connectorEnabled } from "@/lib/hub/sync/scheduler";

/** Spec 2 §3.12: the owner's Connections page and the ops view read this; the UI never inspects raw rows. */

export type CardState = "CONNECTED" | "DEGRADED" | "REAUTH" | "PENDING_APPROVAL" | "PENDING_SETUP" | "AVAILABLE" | "COMING_SOON";

export type ConnectMethod =
  | { kind: "oauth"; href: string }
  | { kind: "keys"; fields: { name: string; label: string; secret: boolean }[]; helpUrl: string | null }
  | { kind: "none" };

export type StreamView = { stream: string; lastSuccessAt: string | null; backfillDone: boolean; failing: boolean; lastError: string | null };

export type ConnectorCard = {
  provider: string;
  displayName: string;
  category: ConnectorCategory;
  state: CardState;
  /** Offered in this restaurant's region (others are listed under "More"). */
  inRegion: boolean;
  feeds: DataContract[];
  connect: ConnectMethod;
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  streams: StreamView[];
};

export type CapabilityView = Capability & { hint: string | null };

const INTEGRATION_STATE: Record<string, CardState> = {
  CONNECTED: "CONNECTED",
  DEGRADED: "DEGRADED",
  REAUTH: "REAUTH",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  PENDING_SETUP: "PENDING_SETUP",
};

const KEY_KINDS = new Set(["API_KEY", "BASIC_KEY_SECRET", "JWT_BEARER"]);

/** Pure: a card's state from its integration row (if any), rollout flag and whether the connect path is configured. */
export function cardState(input: { status: string | null; enabled: boolean; configured: boolean }): CardState {
  const fromRow = input.status ? INTEGRATION_STATE[input.status] : undefined;
  if (fromRow) return fromRow;
  return input.enabled && input.configured ? "AVAILABLE" : "COMING_SOON";
}

function oauthConfigured(m: ConnectorManifest): boolean {
  return Boolean(m.auth.clientIdEnv && m.auth.clientSecretEnv && process.env[m.auth.clientIdEnv] && process.env[m.auth.clientSecretEnv]);
}

export function connectMethod(m: ConnectorManifest, restaurantId: string): ConnectMethod {
  if (m.auth.kind === "OAUTH2_CODE") {
    if (!oauthConfigured(m)) return { kind: "none" };
    const q = new URLSearchParams({ restaurantId, returnTo: "connections" });
    return { kind: "oauth", href: `/api/integrations/${m.provider}/connect?${q}` };
  }
  if (KEY_KINDS.has(m.auth.kind) && m.auth.keyFields?.length) {
    return { kind: "keys", fields: m.auth.keyFields.map(({ name, label, secret }) => ({ name, label, secret })), helpUrl: m.auth.helpUrl ?? null };
  }
  return { kind: "none" };
}

function streamViews(cursors: SyncCursor[]): StreamView[] {
  return cursors
    .map((c) => ({
      stream: c.stream,
      lastSuccessAt: c.lastSuccessAt?.toISOString() ?? null,
      backfillDone: c.backfillDone,
      failing: c.failureCount > 0,
      lastError: c.failureCount > 0 ? c.lastError : null,
    }))
    .sort((a, b) => a.stream.localeCompare(b.stream));
}

export async function connectionsView(restaurantId: string): Promise<{ region: Region; cards: ConnectorCard[]; capabilities: CapabilityView[] }> {
  const [restaurant, integrations] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { countryCode: true } }),
    prisma.integration.findMany({ where: { restaurantId }, include: { syncCursors: true } }),
  ]);
  const region = regionFor(restaurant?.countryCode);
  const byProvider = new Map(integrations.map((i) => [i.provider as string, i]));

  const cards: ConnectorCard[] = [];
  for (const m of allManifests()) {
    if (m.auth.kind === "PLATFORM_KEY") continue;
    const row = byProvider.get(m.provider);
    const enabled = await connectorEnabled(m, restaurantId);
    const connect = connectMethod(m, restaurantId);
    cards.push({
      provider: m.provider,
      displayName: m.displayName,
      category: m.category,
      state: cardState({ status: row?.status ?? null, enabled, configured: connect.kind !== "none" }),
      inRegion: m.regions.includes(region),
      feeds: [...m.dataContracts],
      connect: enabled ? connect : { kind: "none" },
      lastSuccessAt: row?.lastSuccessAt?.toISOString() ?? null,
      lastErrorCode: row?.lastErrorCode ?? null,
      streams: row ? streamViews(row.syncCursors) : [],
    });
  }

  const caps = await capabilitiesFor(restaurantId);
  return {
    region,
    cards,
    capabilities: caps.map((c) => ({ ...c, sources: c.sources.map(sourceLabel), hint: capabilityHint(c) })),
  };
}

function sourceLabel(source: string): string {
  return importSource(source)?.label ?? providerName(source);
}

export type ConnectResult = { ok: true; integration: Integration } | { ok: false; status: number; error: string };

/** API_KEY / BASIC_KEY_SECRET / JWT_BEARER connect: validate with one cheap read, then store the fields encrypted. */
export async function connectWithKeys(input: { restaurantId: string; provider: string; userId: string; fields: Record<string, unknown> }): Promise<ConnectResult> {
  const manifest = getManifest(input.provider);
  if (!manifest || !KEY_KINDS.has(manifest.auth.kind) || !manifest.auth.keyFields?.length) {
    return { ok: false, status: 400, error: "This connection doesn't use API keys." };
  }
  if (!(await connectorEnabled(manifest, input.restaurantId))) {
    return { ok: false, status: 403, error: `${manifest.displayName} isn't available for your restaurant yet.` };
  }
  const read = readKeyFields(manifest.auth.keyFields, input.fields);
  if (!read.ok) return { ok: false, status: 400, error: `Missing: ${read.missing.join(", ")}.` };

  registerAllConnectors();
  const connector = connectorFor(manifest.provider);
  if (!connector) return { ok: false, status: 503, error: "This connection isn't ready yet." };
  const restaurant = await prisma.restaurant.findUnique({ where: { id: input.restaurantId }, select: { countryCode: true } });
  const check = await connector.validateCredentials(read.fields, { region: regionFor(restaurant?.countryCode) }).catch(() => ({
    ok: false as const,
    externalAccountId: undefined,
    error: undefined,
  }));
  if (!check.ok) {
    return { ok: false, status: 422, error: check.error ?? `${manifest.displayName} didn't accept those details. Check them and try again.` };
  }

  const provider = manifest.provider as IntegrationProvider;
  const data = {
    authKind: manifest.auth.kind,
    status: "CONNECTED",
    encryptedApiKey: encryptKeyFields(read.fields),
    encryptedAccessToken: null,
    encryptedRefreshToken: null,
    accessTokenExpiresAt: null,
    externalAccountId: check.externalAccountId ?? null,
    connectedByUserId: input.userId,
    disconnectedAt: null,
    lastErrorCode: null,
    lastErrorAt: null,
  };
  let integration: Integration;
  try {
    integration = await prisma.integration.upsert({
      where: { restaurantId_provider: { restaurantId: input.restaurantId, provider } },
      create: { restaurantId: input.restaurantId, provider, ...data },
      update: data,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, status: 409, error: `That ${manifest.displayName} account is already connected to another restaurant in KOB. Disconnect it there first.` };
    }
    throw err;
  }
  await inngest.send({ name: "hub/integration.connected", data: { integrationId: integration.id } }).catch(() => undefined);
  return { ok: true, integration };
}

/**
 * Disconnect: best-effort provider revoke, then drop credentials and sync cursors. Synced history (orders, guests,
 * menu links) stays so reports don't change retroactively; reconnecting resumes from a fresh backfill.
 */
export async function disconnectIntegration(restaurantId: string, provider: string): Promise<boolean> {
  const row = await prisma.integration.findUnique({ where: { restaurantId_provider: { restaurantId, provider: provider as IntegrationProvider } } });
  if (!row || row.status === "DISCONNECTED") return false;
  registerAllConnectors();
  const connector = connectorFor(provider);
  if (connector?.revoke) await connector.revoke(connectorCtx(row)).catch(() => undefined);
  await prisma.$transaction([
    prisma.syncCursor.deleteMany({ where: { integrationId: row.id } }),
    prisma.integration.update({
      where: { id: row.id },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        encryptedApiKey: null,
        accessTokenExpiresAt: null,
      },
    }),
  ]);
  return true;
}
