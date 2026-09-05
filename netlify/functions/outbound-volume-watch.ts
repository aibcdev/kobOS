import type { Config, Context } from "@netlify/functions";

export default async function handler(_req: Request, _context: Context) {
  const base =
    process.env.URL?.replace(/\/$/, "") ||
    process.env.DEPLOY_PRIME_URL?.replace(/\/$/, "") ||
    process.env.NETLIFY_PRODUCTION_URL?.replace(/\/$/, "") ||
    "https://trykob.com";
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET missing" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const res = await fetch(`${base}/api/cron/outbound-volume`, {
    method: "GET",
    headers: { authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}

export const config: Config = {
  schedule: "0 19 * * *",
};
