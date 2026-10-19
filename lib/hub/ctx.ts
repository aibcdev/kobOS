import type { Integration } from "@prisma/client";
import type { ConnectorCtx } from "@/lib/hub/connector";
import { locationIdsOf } from "@/lib/hub/locations";
import { getAccessToken, getCredentials } from "@/lib/hub/tokens";

/** Builds the per-call context connectors get; tokens are fetched lazily through the token service. */
export function connectorCtx(
  integration: Pick<Integration, "id" | "restaurantId" | "externalAccountId" | "region"> & Partial<Pick<Integration, "metadata">>,
  extra: Partial<Pick<ConnectorCtx, "fetch" | "now">> = {},
): ConnectorCtx {
  return {
    restaurantId: integration.restaurantId,
    integrationId: integration.id,
    externalAccountId: integration.externalAccountId,
    region: integration.region,
    locationIds: locationIdsOf(integration.metadata),
    getAccessToken: () => getAccessToken(integration.id, { fetch: extra.fetch }),
    getCredentials: () => getCredentials(integration.id),
    ...extra,
  };
}
