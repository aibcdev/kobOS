import { handleWebhook } from "@/lib/hub/webhooks/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Integration Hub webhooks (Spec 2 §3.9). Stripe billing and Resend keep their own routes. */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  return handleWebhook(req, (await ctx.params).provider);
}
