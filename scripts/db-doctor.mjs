#!/usr/bin/env node
/* global process */
/**
 * Quick DATABASE_URL check. Run: npm run db:doctor
 * Loads .env then .env.local (same as db:migrate).
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("❌ DATABASE_URL is missing in .env.local");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error("❌ DATABASE_URL is not a valid URL");
  process.exit(1);
}

const host = parsed.hostname;
const port = parsed.port || "5432";
const ref = host.match(/db\.([a-z0-9]+)\.supabase\.co/i)?.[1];

console.log("DATABASE_URL host:", host);
console.log("Port:", port);
const schemaParam = parsed.searchParams.get("schema");
if (schemaParam) console.log("Schema param:", schemaParam);
console.log("Prisma uses schema: kob (see prisma/schema.prisma)");

if (host.endsWith(".supabase.co") && !host.includes("pooler")) {
  console.log("\n⚠️  Direct host (db.*.supabase.co) often fails on home networks.");
  console.log("   In Supabase → Settings → Database, copy **Session pooler** (pooler.supabase.com).");
}

const dig = spawnSync("dig", ["+short", host], { encoding: "utf8" });
const ips = (dig.stdout || "").trim().split("\n").filter(Boolean);
if (ips.length) {
  console.log("DNS:", ips.join(", "));
  if (ips.some((ip) => ip.startsWith("104.") || ip.startsWith("172.64."))) {
    console.log("\n❌ Host resolves to Cloudflare — not a live Postgres endpoint.");
    console.log("   This usually means the Supabase project was deleted or the URL is wrong.");
    console.log("   Create or open an active project and paste a fresh connection string.");
    process.exit(1);
  }
}

console.log("\nTesting Prisma connection…");
try {
  const { PrismaClient } = await import("@prisma/client");
  const p = new PrismaClient();
  await p.$queryRaw`SELECT 1`;
  await p.$disconnect();
  console.log("✅ Database OK");
} catch (e) {
  const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
  console.error("❌", msg);
  if (ref) console.error(`\nProject ref in URL: ${ref} — confirm it exists in your Supabase dashboard.`);
  process.exit(1);
}
