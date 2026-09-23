import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/crypto/tokens";
import { decryptIntegrationToken } from "@/lib/integrations/get-integration-token";
import { isOAuthConfigured } from "@/lib/integrations/oauth-config";
import { TALK_PROVIDERS, type TalkConnector, type TalkProvider } from "./types";

export class ConnectorError extends Error {
  constructor(
    public provider: TalkProvider,
    public code: "disconnected" | "reconnect" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

export function connectorConfigured(provider: TalkProvider) {
  return (
    isOAuthConfigured(provider) &&
    Buffer.from(process.env.INTEGRATION_ENC_KEY ?? "", "base64").length === 32
  );
}

export async function listTalkConnectors(
  restaurantId: string,
): Promise<TalkConnector[]> {
  const rows = await prisma.integration.findMany({
    where: { restaurantId, provider: { in: [...TALK_PROVIDERS] } },
  });
  return TALK_PROVIDERS.map((provider) => {
    const row = rows.find((r) => r.provider === provider);
    const meta = (row?.metadata ?? {}) as Record<string, unknown>;
    return {
      provider,
      hasAccount: Boolean(row),
      name: provider === "GMAIL" ? "Gmail" : "Google Calendar",
      description:
        provider === "GMAIL"
          ? "Find emails and prepare replies in Talk. No sending."
          : "Check your primary calendar. No event changes.",
      state: !connectorConfigured(provider)
        ? "unavailable"
        : !row?.encryptedAccessToken
          ? "disconnected"
          : meta.talkStatus === "reconnect"
            ? "reconnect"
            : meta.talkCheckedAt
              ? "connected"
              : "unverified",
      checkedAt:
        typeof meta.talkCheckedAt === "string" ? meta.talkCheckedAt : null,
    };
  });
}

/** Only fixed Google read APIs call this helper; neither model nor client can supply a host. */
export async function googleRead(
  restaurantId: string,
  provider: TalkProvider,
  path: string,
): Promise<unknown> {
  const root =
    provider === "GMAIL"
      ? "https://gmail.googleapis.com/gmail/v1/users/me/"
      : "https://www.googleapis.com/calendar/v3/calendars/primary/";
  if (!/^(messages|events)([/?]|$)/.test(path) || path.includes(".."))
    throw new Error("Invalid Google resource");
  const row = await prisma.integration.findUnique({
    where: { restaurantId_provider: { restaurantId, provider } },
  });
  if (!row)
    throw new ConnectorError(
      provider,
      "disconnected",
      `Connect ${provider === "GMAIL" ? "Gmail" : "Google Calendar"} to continue.`,
    );
  const tokens = decryptIntegrationToken(row);
  let accessToken = tokens.accessToken;
  const refreshToken = tokens.refreshToken;
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const fail = async () => {
    await prisma.integration.updateMany({
      where: { id: row.id },
      data: { metadata: { ...metadata, talkStatus: "reconnect" } },
    });
    throw new ConnectorError(
      provider,
      "reconnect",
      "This connection needs you to sign in again.",
    );
  };
  if (!accessToken) return fail();
  const request = () =>
    fetch(`${root}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  let response = await request();
  if (response.status === 401) {
    if (!refreshToken || !connectorConfigured(provider)) return fail();
    const refresh = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!refresh.ok) {
      if (refresh.status === 400 || refresh.status === 401) return fail();
      throw new ConnectorError(
        provider,
        "unavailable",
        "Google is temporarily unavailable. Try again.",
      );
    }
    const tokens = (await refresh.json()) as { access_token?: string };
    if (!tokens.access_token) return fail();
    accessToken = tokens.access_token;
    const updated = await prisma.integration.updateMany({
      where: { id: row.id, encryptedAccessToken: row.encryptedAccessToken },
      data: { encryptedAccessToken: encryptSecret(accessToken) },
    });
    if (!updated.count)
      throw new ConnectorError(
        provider,
        "reconnect",
        "The connection changed. Try again.",
      );
    response = await request();
  }
  if (response.status === 401 || response.status === 403) return fail();
  if (!response.ok)
    throw new ConnectorError(
      provider,
      "unavailable",
      response.status === 429
        ? "Google is busy. Please try again shortly."
        : "Couldn't read Google. Please try again.",
    );
  const data: unknown = await response.json();
  // Never recreate a connection that was disconnected during the request.
  const updated = await prisma.integration.updateMany({
    where: { id: row.id },
    data: {
      metadata: {
        ...metadata,
        talkStatus: "connected",
        talkCheckedAt: new Date().toISOString(),
      },
    },
  });
  if (!updated.count)
    throw new ConnectorError(
      provider,
      "disconnected",
      "This connection was disconnected.",
    );
  return data;
}
