import { badSignature, env, hmac, notConfigured, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { Verifier } from "@/lib/hub/webhooks/types";

/** X-Twilio-Signature = base64 HMAC-SHA1(authToken, url + concat(sorted POST key+value)). Same algorithm as twilio.validateRequest. */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  return hmac("sha1", authToken, data, "base64");
}

/**
 * Each restaurant's numbers live on its own Twilio subaccount, and Twilio signs with that subaccount's token. The
 * subaccount is an Integration (provider TWILIO, externalAccountId = AccountSid) with `authToken` in its key fields.
 */
export async function subaccountToken(accountSid: string): Promise<string | null> {
  const [{ prisma }, { decryptKeyFields }] = await Promise.all([import("@/lib/db/prisma"), import("@/lib/hub/auth/api-key")]);
  const row = await prisma.integration.findFirst({
    where: { provider: "TWILIO", externalAccountId: accountSid, status: { not: "DISCONNECTED" } },
    select: { encryptedApiKey: true },
  });
  return row?.encryptedApiKey ? (decryptKeyFields(row.encryptedApiKey).authToken ?? null) : null;
}

export function createTwilioVerifier(lookup: (accountSid: string) => Promise<string | null> = subaccountToken): Verifier {
  return {
    provider: "twilio",
    integrationProvider: "TWILIO",
    async verify({ raw, headers, urls }) {
      const params = Object.fromEntries(new URLSearchParams(raw));
      const accountSid = params.AccountSid;
      const sub = accountSid ? await lookup(accountSid).catch(() => null) : null;
      const tokens = [sub, env("TWILIO_AUTH_TOKEN")].filter((t): t is string => Boolean(t));
      if (!tokens.length) return notConfigured("TWILIO_AUTH_TOKEN");
      const sig = headers.get("x-twilio-signature");
      if (!tokens.some((token) => urls.some((u) => safeEqual(twilioSignature(token, u, params), sig)))) return badSignature;
      const sid = params.CallSid ?? params.MessageSid ?? params.SmsSid;
      if (!sid) return { ok: true, events: [] };
      const status = params.CallStatus ?? params.MessageStatus ?? params.SmsStatus ?? "received";
      return {
        ok: true,
        events: [{ externalId: `${sid}:${status}`, type: params.CallSid ? `call.${status}` : `message.${status}`, accountId: accountSid ?? null, payload: params }],
      };
    },
  };
}

export const twilioVerifier = createTwilioVerifier();
