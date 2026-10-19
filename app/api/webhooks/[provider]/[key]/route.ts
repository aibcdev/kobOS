import { handleWebhook } from "@/lib/hub/webhooks/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Per-venue secret paths (Purple Wi-Fi, Deputy if unsigned): /api/webhooks/<provider>/<key>. */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string; key: string }> }) {
  const { provider, key } = await ctx.params;
  return handleWebhook(req, provider, key);
}
