#!/usr/bin/env node
/**
 * Production Stripe setup in one command.
 *
 * 1. Add to .env.local (one line from Stripe Dashboard → Developers → API keys):
 *    STRIPE_SECRET_KEY=sk_live_...
 *
 * 2. Run:
 *    npm run stripe:go-live
 *
 * Creates live KOB Flex ($49) + Flat ($99), prints Netlify paste block.
 * Optional: NETLIFY_SITE_ID=6348ca5b-9101-4ed6-bb07-f4ec29dda60c npm run stripe:go-live -- --netlify
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

const PLANS = [
  {
    envKey: "STRIPE_PRICE_STARTER",
    name: "KOB Flex",
    description: "Founding Flex — $49/mo + 2.5% per direct order. Daily helper + free scan.",
    amountCents: 4900,
    metadata: { kob_tier: "starter", kob_plan: "flex" },
  },
  {
    envKey: "STRIPE_PRICE_PRO",
    name: "KOB Flat",
    description: "Founding Flat — $99/mo, no order fees. Daily helper + free scan.",
    amountCents: 9900,
    metadata: { kob_tier: "pro", kob_plan: "flat" },
  },
];

async function stripeApi(secretKey, method, path, body) {
  let fetchBody;
  if (body) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, item);
      } else {
        params.append(key, value);
      }
    }
    fetchBody = params.toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: fetchBody,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
  return json;
}

async function findExisting(secretKey, tier) {
  const prices = await stripeApi(secretKey, "GET", "/prices?limit=100&active=true", null);
  for (const p of prices.data ?? []) {
    if (p.metadata?.kob_tier === tier && p.recurring?.interval === "month" && p.livemode) {
      return p.id;
    }
  }
  return null;
}

async function ensureProducts(secretKey) {
  const out = {};
  for (const plan of PLANS) {
    const existing = await findExisting(secretKey, plan.metadata.kob_tier);
    if (existing) {
      console.log(`  ✓ ${plan.name} (live, exists) → ${existing}`);
      out[plan.envKey] = existing;
      continue;
    }
    const product = await stripeApi(secretKey, "POST", "/products", {
      name: plan.name,
      description: plan.description,
      "metadata[kob_tier]": plan.metadata.kob_tier,
      "metadata[kob_plan]": plan.metadata.kob_plan,
    });
    const price = await stripeApi(secretKey, "POST", "/prices", {
      product: product.id,
      unit_amount: String(plan.amountCents),
      currency: "usd",
      "recurring[interval]": "month",
      "metadata[kob_tier]": plan.metadata.kob_tier,
      "metadata[kob_plan]": plan.metadata.kob_plan,
    });
    console.log(`  ✓ Created ${plan.name} (live) → ${price.id}`);
    out[plan.envKey] = price.id;
  }
  return out;
}

function setNetlifyEnv(_siteId, key, value) {
  const r = spawnSync("npx", ["netlify", "env:set", key, value, "--context", "production", "--force"], {
    encoding: "utf8",
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    console.error(`  ✗ Netlify env:set ${key} failed: ${r.stderr || r.stdout}`);
    return false;
  }
  console.log(`  ✓ Netlify ${key}`);
  return true;
}

const WEBHOOK_URL = "https://trykob.com/api/stripe/webhook";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
];

async function findExistingWebhook(secretKey) {
  const list = await stripeApi(secretKey, "GET", "/webhook_endpoints?limit=100", null);
  for (const endpoint of list.data ?? []) {
    if (endpoint.url === WEBHOOK_URL && endpoint.status === "enabled") {
      return endpoint;
    }
  }
  return null;
}

async function ensureWebhook(secretKey) {
  const existing = await findExistingWebhook(secretKey);
  if (existing) {
    console.log(`  ✓ Webhook already exists → ${existing.id}`);
    console.log("    Reveal signing secret in Stripe Dashboard → Webhooks → this endpoint");
    return { id: existing.id, secret: null, existing: true };
  }

  const created = await stripeApi(secretKey, "POST", "/webhook_endpoints", {
    url: WEBHOOK_URL,
    description: "KOB trykob.com production",
    "enabled_events[]": WEBHOOK_EVENTS,
  });
  console.log(`  ✓ Created webhook → ${created.id}`);
  if (created.secret) {
    console.log(`  ✓ Signing secret → ${created.secret.slice(0, 12)}...`);
    return { id: created.id, secret: created.secret, existing: false };
  }
  console.log("  ○ Stripe did not return secret — copy whsec_... from Dashboard → Webhooks");
  return { id: created.id, secret: null, existing: false };
}

async function main() {
  const pushNetlify = process.argv.includes("--netlify");
  const siteId = process.env.NETLIFY_SITE_ID || "6348ca5b-9101-4ed6-bb07-f4ec29dda60c";
  const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local"), ...process.env };
  const secretKey = env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey?.startsWith("sk_live_")) {
    console.error(`
Need your LIVE secret key in .env.local:

  STRIPE_SECRET_KEY=sk_live_...

Get it: Stripe Dashboard → Developers → API keys → Reveal live secret key
(Test mode OFF)

Then run: npm run stripe:go-live
`);
    process.exit(1);
  }

  const pk = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!pk?.startsWith("pk_live_")) {
    console.log("  ○ Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... to .env.local for Netlify push\n");
  }

  console.log("\nKOB Stripe — LIVE production setup\n");
  const priceIds = await ensureProducts(secretKey);
  console.log("\nWebhook…\n");
  const webhook = await ensureWebhook(secretKey);
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || webhook.secret;

  console.log(`
── Add to Netlify (kobkob / trykob.com) ──

STRIPE_SECRET_KEY=${secretKey.slice(0, 12)}...  (already in .env.local)
STRIPE_WEBHOOK_SECRET=${webhookSecret ? `${webhookSecret.slice(0, 12)}...` : "(copy whsec_ from Stripe Dashboard)"}
STRIPE_PRICE_STARTER=${priceIds.STRIPE_PRICE_STARTER}
STRIPE_PRICE_PRO=${priceIds.STRIPE_PRICE_PRO}
STRIPE_GROWTH_PRICE_ID=${priceIds.STRIPE_PRICE_STARTER}
STRIPE_TRIAL_DAYS=7
`);

  if (pushNetlify) {
    console.log("Pushing to Netlify production…\n");
    setNetlifyEnv(siteId, "STRIPE_SECRET_KEY", secretKey);
    if (webhookSecret?.startsWith("whsec_")) {
      setNetlifyEnv(siteId, "STRIPE_WEBHOOK_SECRET", webhookSecret);
    } else {
      console.log("  ○ STRIPE_WEBHOOK_SECRET not pushed — set whsec_ manually in Netlify");
    }
    if (pk) setNetlifyEnv(siteId, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", pk);
    setNetlifyEnv(siteId, "STRIPE_PRICE_STARTER", priceIds.STRIPE_PRICE_STARTER);
    setNetlifyEnv(siteId, "STRIPE_PRICE_PRO", priceIds.STRIPE_PRICE_PRO);
    setNetlifyEnv(siteId, "STRIPE_GROWTH_PRICE_ID", priceIds.STRIPE_PRICE_STARTER);
    setNetlifyEnv(siteId, "STRIPE_TRIAL_DAYS", "7");
    console.log("\nRedeploy: npx netlify deploy --prod (or trigger in Netlify UI)\n");
  } else {
    console.log("To push to Netlify automatically: npm run stripe:go-live -- --netlify\n");
  }

  console.log(`Webhook URL: ${WEBHOOK_URL}\n`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}\n`);
  process.exit(1);
});
