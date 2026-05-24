/** Base URL for metadata, OG tags, and absolute links. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  /* KOB local dev: `npm run dev:kob` (port 3333). Override with NEXT_PUBLIC_SITE_URL. */
  return "http://localhost:3333";
}
