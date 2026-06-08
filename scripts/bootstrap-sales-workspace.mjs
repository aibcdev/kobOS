#!/usr/bin/env node
/**
 * Creates KOB sales workspace (Restaurant row) for UK cold outbound.
 * Run: npm run sales:bootstrap
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.local"));

const { PrismaClient, SubscriptionPlan } = await import("@prisma/client");
const prisma = new PrismaClient();

const SLUG = "kob-sales-workspace";
const NAME = "KOB";

try {
  let restaurant = await prisma.restaurant.findUnique({ where: { slug: SLUG } });

  if (!restaurant) {
    const org = await prisma.organization.create({
      data: { name: "KOB" },
    });
    restaurant = await prisma.restaurant.create({
      data: {
        organizationId: org.id,
        name: NAME,
        slug: SLUG,
        city: "London",
        timezone: "Europe/London",
        subscriptionPlan: SubscriptionPlan.PRO,
        website: process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || undefined,
      },
    });
    console.log("Created sales workspace restaurant.");
  } else {
    console.log("Sales workspace already exists.");
  }

  console.log("\nOUTBOUND_WORKSPACE_RESTAURANT_ID=" + restaurant.id);

  const envPath = resolve(root, ".env.local");
  if (existsSync(envPath)) {
    let text = readFileSync(envPath, "utf8");
    const line = `OUTBOUND_WORKSPACE_RESTAURANT_ID=${restaurant.id}`;
    if (/^OUTBOUND_WORKSPACE_RESTAURANT_ID=/m.test(text)) {
      text = text.replace(/^OUTBOUND_WORKSPACE_RESTAURANT_ID=.*$/m, line);
    } else {
      text = text.trimEnd() + "\n" + line + "\n";
    }
    writeFileSync(envPath, text.endsWith("\n") ? text : text + "\n");
    console.log("Updated .env.local with OUTBOUND_WORKSPACE_RESTAURANT_ID");
  }
} finally {
  await prisma.$disconnect();
}
