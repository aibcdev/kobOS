import type { ConnectorManifest } from "@/lib/hub/manifest";

/** The provider data region for a restaurant's country, for manifests with regional data centres; otherwise null. */
export function providerRegion(m: ConnectorManifest, countryCode: string | null | undefined): string | null {
  const origins = m.auth.regionOrigins;
  if (!origins) return null;
  const c = (countryCode ?? "").toUpperCase();
  return m.auth.regionByCountry?.[c === "UK" ? "GB" : c] ?? Object.keys(origins)[0] ?? null;
}

export function sandboxActive(m: ConnectorManifest): boolean {
  return Boolean(m.auth.sandbox && process.env[m.auth.sandbox.env]?.trim().toLowerCase() === "sandbox");
}

/** OAuth URLs for an integration's region (or the sandbox), keeping each URL's path. */
export function oauthUrls(m: ConnectorManifest, region: string | null | undefined): { authorizeUrl?: string; tokenUrl?: string; refreshUrl?: string } {
  const origin = sandboxActive(m) ? m.auth.sandbox!.origin : region ? m.auth.regionOrigins?.[region] : undefined;
  const at = (u: string | undefined) => (u && origin ? `${origin}${new URL(u).pathname}` : u);
  return { authorizeUrl: at(m.auth.authorizeUrl), tokenUrl: at(m.auth.tokenUrl), refreshUrl: at(m.auth.refreshUrl ?? m.auth.tokenUrl) };
}
