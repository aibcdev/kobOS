import { createHmac, timingSafeEqual } from "node:crypto";

type OAuthStatePayload = {
  restaurantId: string;
  provider: string;
  userId: string;
  exp: number;
};

function stateSecret(): string | null {
  const enc = process.env.INTEGRATION_ENC_KEY?.trim();
  if (enc) return enc;
  const cron = process.env.CRON_SECRET?.trim();
  if (cron) return cron;
  return null;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function encodeOAuthState(input: {
  restaurantId: string;
  provider: string;
  userId: string;
  ttlSec?: number;
}): string {
  const secret = stateSecret();
  if (!secret) {
    throw new Error("OAuth state signing requires INTEGRATION_ENC_KEY or CRON_SECRET");
  }
  const payload: OAuthStatePayload = {
    restaurantId: input.restaurantId,
    provider: input.provider,
    userId: input.userId,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSec ?? 60 * 30),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function decodeOAuthState(raw: string): OAuthStatePayload | null {
  const secret = stateSecret();
  if (!secret) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
    if (!payload.restaurantId || !payload.provider || !payload.userId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
