import { cloverConnector } from "@/lib/connectors/clover/connector";
import { eposNowConnector } from "@/lib/connectors/epos-now/connector";
import { squareConnector } from "@/lib/connectors/square/connector";
import { toastConnector } from "@/lib/connectors/toast/connector";
import { zettleConnector } from "@/lib/connectors/zettle/connector";
import { connectorFor, registerConnector, type Connector } from "@/lib/hub/connector";

export const CONNECTORS: readonly Connector[] = [squareConnector, toastConnector, eposNowConnector, zettleConnector, cloverConnector];

/** Registers every connector implementation with the hub. Idempotent; call before syncing or processing webhooks. */
export function registerAllConnectors(): void {
  for (const c of CONNECTORS) if (connectorFor(c.manifest.provider) !== c) registerConnector(c);
}
