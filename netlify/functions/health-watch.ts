import type { Context } from "@netlify/functions";

const handler = async (_req: Request, context: Context) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return new Response("CRON_SECRET missing", { status: 500 });
  const origin = process.env.URL?.trim() || context.site?.url || "https://trykob.com";
  const response = await fetch(`${origin}/api/cron/health-watch`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") || "application/json" },
  });
};

export default handler;
