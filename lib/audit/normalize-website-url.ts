/** True when input looks like a website URL or bare domain (not a place name). */
export function looksLikeWebsiteInput(raw: string): boolean {
  const s = raw.trim();
  if (!s || /\s/.test(s)) return false;

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      return Boolean(u.hostname.includes("."));
    } catch {
      return false;
    }
  }

  if (!s.includes(".")) return false;

  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:\/[^\s]*)?$/i.test(
    s.replace(/\/$/, ""),
  );
}

/** Add https:// when missing; returns null if not a valid http(s) URL. */
export function normalizeAuditWebsiteUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;

  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}
