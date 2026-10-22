import type { Verifier } from "@/lib/hub/webhooks/types";
import { cloverVerifier } from "./clover";
import { openaiVerifier } from "./openai";
import { purpleVerifier } from "./purple";
import { qboVerifier } from "./qbo";
import { retellVerifier } from "./retell";
import { squareVerifier } from "./square";
import { stripeConnectVerifier } from "./stripe-connect";
import { twilioVerifier } from "./twilio";
import { vapiVerifier } from "./vapi";
import { xeroVerifier } from "./xero";

const ALL: Verifier[] = [
  squareVerifier,
  stripeConnectVerifier,
  twilioVerifier,
  cloverVerifier,
  xeroVerifier,
  qboVerifier,
  purpleVerifier,
  openaiVerifier,
  retellVerifier,
  vapiVerifier,
];

const BY_PROVIDER = new Map(ALL.map((v) => [v.provider, v]));

export function verifierFor(provider: string): Verifier | undefined {
  return BY_PROVIDER.get(provider);
}

export function webhookProviders(): string[] {
  return ALL.map((v) => v.provider);
}
