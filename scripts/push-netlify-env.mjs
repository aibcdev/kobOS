#!/usr/bin/env node
/**
 * Push production env vars to Netlify from .env.local + netlify-env-paste.txt.
 * Run: npm run netlify:push-env
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function loadEnvFile(name) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val) out[key] = val;
  }
  return out;
}

function readStripePublishableKey() {
  const configPath = resolve(process.env.HOME || "", ".config/stripe/config.toml");
  if (!existsSync(configPath)) return null;
  const text = readFileSync(configPath, "utf8");
  const match = text.match(/live_mode_pub_key\s*=\s*'([^']+)'/);
  return match?.[1]?.trim() || null;
}

function pickGeminiKey(env) {
  const local = env.GEMINI_API_KEY?.trim() ?? "";
  if (local) return local;
  return loadEnvFile("netlify-env-paste.txt").GEMINI_API_KEY?.trim() ?? null;
}

const PUSH_KEYS = [
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_AUTH_FROM_EMAIL",
  "RESEND_REPLY_TO",
  "OUTBOUND_RESEND_NOTIFY_EMAIL",
  "OUTBOUND_SEND_BATCH",
  "OUTBOUND_SEND_DELAY_SEC",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

function setNetlifyEnv(_siteId, key, value) {
  const r = spawnSync("npx", ["netlify", "env:set", key, value, "--context", "production", "--force"], {
    encoding: "utf8",
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    console.error(`  ✗ ${key}: ${(r.stderr || r.stdout).trim()}`);
    return false;
  }
  console.log(`  ✓ ${key}`);
  return true;
}

function main() {
  const siteId = process.env.NETLIFY_SITE_ID || "6348ca5b-9101-4ed6-bb07-f4ec29dda60c";
  const env = {
    ...loadEnvFile("netlify-env-paste.txt"),
    ...loadEnvFile(".env"),
    ...loadEnvFile(".env.local"),
    ...process.env,
  };

  const gemini = pickGeminiKey(env);
  if (gemini) env.GEMINI_API_KEY = gemini;
  if (!env.GEMINI_MODEL?.trim()) env.GEMINI_MODEL = "gemini-2.5-flash";

  const pk = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || readStripePublishableKey();
  if (pk) env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk;

  console.log("\nPushing production env to Netlify…\n");
  let ok = true;
  for (const key of PUSH_KEYS) {
    const value = env[key]?.trim();
    if (!value) {
      console.log(`  ○ ${key} (skip — no value)`);
      continue;
    }
    if (!setNetlifyEnv(siteId, key, value)) ok = false;
  }

  if (gemini && gemini.length < 20) {
    console.log("\n  ⚠ GEMINI_API_KEY looks too short — check .env.local\n");
  }

  console.log(`
Stripe still needs sk_live_ in .env.local, then run:
  npm run stripe:go-live -- --netlify

Then redeploy Netlify.
`);
  if (!ok) process.exit(1);
}

main();
