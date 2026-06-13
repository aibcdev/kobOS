#!/usr/bin/env node
/**
 * Create KOB Stripe products + monthly prices (Flex $125, Flat $250).
 *
 * Option A — API key in .env.local:
 *   STRIPE_SECRET_KEY=sk_test_... npm run stripe:bootstrap
 *
 * Option B — Stripe CLI (after `stripe login`):
 *   stripe login
 *   npm run stripe:bootstrap -- --cli
 *
 * Prints price IDs to paste into Netlify + .env.local.
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

const useCli = process.argv.includes("--cli");
const useLive = process.argv.includes("--live");
const env = {
  ...loadEnvFile(".env"),
  ...loadEnvFile(".env.local"),
  ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => typeof v === "string" && v.trim())),
};

const PLANS = [
  {
    envKey: "STRIPE_PRICE_STARTER",
    name: "KOB Flex",
    description: "Flex plan — $49/mo founding + 2.5% per direct order. Daily task helper + free scan.",
    amountCents: 4900,
    metadata: { kob_tier: "starter", kob_plan: "flex" },
  },
  {
    envKey: "STRIPE_PRICE_PRO",
    name: "KOB Flat",
    description: "Flat plan — $99/mo founding, no order fees. Daily task helper + free scan.",
    amountCents: 9900,
    metadata: { kob_tier: "pro", kob_plan: "flat" },
  },
];

async function stripeApiRequest(secretKey, method, path, body) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Stripe API ${res.status}`);
  }
  return json;
}

function stripeCli(args) {
  const fullArgs = useLive ? [...args, "--live"] : args;
  const r = spawnSync("stripe", fullArgs, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || r.stdout?.trim() || "stripe CLI failed");
  }
  const json = JSON.parse(r.stdout);
  if (json.error) {
    throw new Error(json.error.message ?? "Stripe CLI error");
  }
  if (!json.id) {
    throw new Error(`Stripe CLI returned no id: ${r.stdout.slice(0, 200)}`);
  }
  return json;
}

async function findExistingPrice(secretKey, tier) {
  const prices = await stripeApiRequest(secretKey, "GET", "/prices?limit=100&active=true&expand[]=data.product", null);
  for (const p of prices.data ?? []) {
    if (p.metadata?.kob_tier === tier && p.recurring?.interval === "month") {
      return p.id;
    }
  }
  return null;
}

async function createViaApi(secretKey) {
  const out = {};
  for (const plan of PLANS) {
    const existing = await findExistingPrice(secretKey, plan.metadata.kob_tier);
    if (existing) {
      console.log(`  ✓ ${plan.name} already exists → ${existing}`);
      out[plan.envKey] = existing;
      continue;
    }
    const product = await stripeApiRequest(secretKey, "POST", "/products", {
      name: plan.name,
      description: plan.description,
      "metadata[kob_tier]": plan.metadata.kob_tier,
      "metadata[kob_plan]": plan.metadata.kob_plan,
    });
    const price = await stripeApiRequest(secretKey, "POST", "/prices", {
      product: product.id,
      unit_amount: String(plan.amountCents),
      currency: "usd",
      "recurring[interval]": "month",
      "metadata[kob_tier]": plan.metadata.kob_tier,
      "metadata[kob_plan]": plan.metadata.kob_plan,
    });
    console.log(`  ✓ Created ${plan.name} → ${price.id}`);
    out[plan.envKey] = price.id;
  }
  return out;
}

function createViaCli() {
  const out = {};
  for (const plan of PLANS) {
    const product = stripeCli([
      "products",
      "create",
      "--name",
      plan.name,
      "--description",
      plan.description,
      "-d",
      `metadata[kob_tier]=${plan.metadata.kob_tier}`,
      "-d",
      `metadata[kob_plan]=${plan.metadata.kob_plan}`,
    ]);
    const price = stripeCli([
      "prices",
      "create",
      "--product",
      product.id,
      "--unit-amount",
      String(plan.amountCents),
      "--currency",
      "usd",
      "-d",
      "recurring[interval]=month",
      "-d",
      `metadata[kob_tier]=${plan.metadata.kob_tier}`,
      "-d",
      `metadata[kob_plan]=${plan.metadata.kob_plan}`,
    ]);
    console.log(`  ✓ Created ${plan.name} → ${price.id}`);
    out[plan.envKey] = price.id;
  }
  return out;
}

async function main() {
  console.log("\nKOB Stripe bootstrap\n");

  let priceIds;
  if (useCli) {
    console.log(`Using Stripe CLI (${useLive ? "LIVE" : "TEST"})…\n`);
    priceIds = createViaCli();
  } else {
    const key = env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
      console.error("Missing STRIPE_SECRET_KEY.\n");
      console.error("Either:");
      console.error("  1. Add sk_test_... or sk_live_... to .env.local, then re-run");
      console.error("  2. Run: stripe login");
      console.error("  3. Run: npm run stripe:bootstrap -- --cli\n");
      process.exit(1);
    }
    if (useLive && !key.startsWith("sk_live")) {
      console.error("For --live use sk_live_... in STRIPE_SECRET_KEY, or run: npm run stripe:bootstrap -- --cli --live\n");
      process.exit(1);
    }
    const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
    console.log(`Using API key (${mode})…\n`);
    priceIds = await createViaApi(key);
  }

  console.log(`
── Paste into Netlify + .env.local ──

STRIPE_PRICE_STARTER=${priceIds.STRIPE_PRICE_STARTER}
STRIPE_PRICE_PRO=${priceIds.STRIPE_PRICE_PRO}
STRIPE_GROWTH_PRICE_ID=${priceIds.STRIPE_PRICE_STARTER}
STRIPE_TRIAL_DAYS=7

── Webhook (production) ──

Stripe Dashboard → Webhooks → Add endpoint:
  https://trykob.com/api/stripe/webhook
Events: checkout.session.completed, customer.subscription.*

Copy signing secret → STRIPE_WEBHOOK_SECRET in Netlify

── Also need in Netlify ──

STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}\n`);
  process.exit(1);
});
