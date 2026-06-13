import type { IntegrationProvider } from "@prisma/client";

type OAuthConfig = {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
};

const CONFIG: Partial<Record<IntegrationProvider, OAuthConfig>> = {
  GOOGLE_ANALYTICS: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
  },
  GOOGLE_SEARCH_CONSOLE: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
  },
  GOOGLE_CALENDAR: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
  },
  GMAIL: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
  },
  SQUARE: {
    authUrl: "https://connect.squareup.com/oauth2/authorize",
    tokenUrl: "https://connect.squareup.com/oauth2/token",
    scopes: ["ORDERS_READ", "MERCHANT_PROFILE_READ"],
    clientIdEnv: "SQUARE_APPLICATION_ID",
    clientSecretEnv: "SQUARE_APPLICATION_SECRET",
  },
};

export function getOAuthConfig(provider: IntegrationProvider): OAuthConfig | null {
  return CONFIG[provider] ?? null;
}

export function isOAuthConfigured(provider: IntegrationProvider): boolean {
  const cfg = getOAuthConfig(provider);
  if (!cfg) return false;
  return Boolean(process.env[cfg.clientIdEnv] && process.env[cfg.clientSecretEnv]);
}

export function buildOAuthUrl(provider: IntegrationProvider, state: string, redirectUri: string): string | null {
  const cfg = getOAuthConfig(provider);
  if (!cfg) return null;
  const clientId = process.env[cfg.clientIdEnv];
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${cfg.authUrl}?${params.toString()}`;
}
