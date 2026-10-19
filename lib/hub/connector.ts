import type { ActionAdapter } from "@/lib/agent/verify";
import type { HealthResult } from "@/lib/os/adapter";
import type { ConnectorManifest } from "@/lib/hub/manifest";

/** What every connector call gets: the tenant, the integration row id and a token getter (lib/hub/tokens.ts). */
export type ConnectorCtx = {
  restaurantId: string;
  integrationId: string;
  /** External account (merchant_id, tenantId, realmId…) when known. */
  externalAccountId?: string | null;
  region?: string | null;
  getAccessToken(): Promise<string>;
  /** API_KEY / BASIC_KEY_SECRET connectors: decrypted key fields. */
  getCredentials?(): Promise<Record<string, string>>;
  fetch?: typeof fetch;
  now?: () => Date;
};

export type ExternalLocation = { externalId: string; name: string; address?: string; timezone?: string; currency?: string };

export type SyncPage = { rows: number; nextCursor: string | null; done: boolean };

/** Raw webhook as stored in ConnectorEvent (T-81). */
export type ConnectorEventRow = {
  id: string;
  provider: string;
  externalId: string;
  type: string;
  payloadJson: unknown;
  restaurantId: string | null;
  integrationId: string | null;
};

/**
 * Spec 2 §3.4. Reads (`sync`) are per stream and page; writes go through the Spec 1 ledger only, so they are an
 * `ActionAdapter` (precheck/execute/verify) run by `kob-action-execute`, never called directly.
 */
export interface Connector {
  manifest: ConnectorManifest;
  /** Cheap read call made before credentials are saved. */
  validateCredentials(input: Record<string, string>, ctx?: Pick<ConnectorCtx, "fetch" | "region">): Promise<{
    ok: boolean;
    externalAccountId?: string;
    error?: string;
  }>;
  listLocations?(ctx: ConnectorCtx): Promise<ExternalLocation[]>;
  sync(ctx: ConnectorCtx, stream: string, cursor: string | null): Promise<SyncPage>;
  handleWebhook?(ctx: ConnectorCtx, event: ConnectorEventRow): Promise<void>;
  actions?: ActionAdapter;
  health?(ctx: ConnectorCtx): Promise<HealthResult>;
  /** Called on disconnect, before synced data is deleted. */
  revoke?(ctx: ConnectorCtx): Promise<void>;
}

const connectors = new Map<string, Connector>();

/** Connector implementations register by manifest provider (T-88 Square/Toast/Epos Now/Zettle, T-89 Clover). */
export function registerConnector(connector: Connector): void {
  connectors.set(connector.manifest.provider, connector);
}

export function connectorFor(provider: string): Connector | undefined {
  return connectors.get(provider);
}

export function clearConnectors(): void {
  connectors.clear();
}
