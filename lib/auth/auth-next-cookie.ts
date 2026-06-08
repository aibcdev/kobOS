/** Short-lived cookie: where to send the user after magic-link sign-in. */
export const AUTH_NEXT_COOKIE = "kob_auth_next";
export const AUTH_NEXT_MAX_AGE_SEC = 600;

export function safeNextPath(raw: string | null | undefined): string {
  const next = raw?.trim() || "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export function readAuthNextCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_NEXT_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function clearAuthNextCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_NEXT_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
}
