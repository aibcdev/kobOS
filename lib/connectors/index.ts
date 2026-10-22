import { cloverConnector } from "@/lib/connectors/clover/connector";
import { eposNowConnector } from "@/lib/connectors/epos-now/connector";
import { gbpConnector } from "@/lib/connectors/gbp/connector";
import { squareConnector } from "@/lib/connectors/square/connector";
import { toastConnector } from "@/lib/connectors/toast/connector";
import { zettleConnector } from "@/lib/connectors/zettle/connector";
import { registerActionAdapter } from "@/lib/agent/verify";
import { connectorFor, registerConnector, type Connector } from "@/lib/hub/connector";

export const CONNECTORS: readonly Connector[] = [squareConnector, toastConnector, eposNowConnector, zettleConnector, cloverConnector, gbpConnector];

/**
 * Registers every connector implementation with the hub, and its ledger adapter (if it has one) with the executor.
 * Idempotent; call before syncing, processing webhooks or executing actions.
 */
export function registerAllConnectors(): void {
  for (const c of CONNECTORS) {
    if (connectorFor(c.manifest.provider) === c) continue;
    registerConnector(c);
    if (c.actions) registerActionAdapter(c.manifest.provider, c.actions);
  }
}
