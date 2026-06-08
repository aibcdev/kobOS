#!/usr/bin/env node
/**
 * Pre-launch checklist — env vars + reminders for trykob.com.
 * Run: npm run launch:check
 * Strict: npm run launch:check -- --production
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

const production = process.argv.includes("--production");
const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const domain = env.NETLIFY_PRODUCTION_URL?.replace(/\/$/, "") || "https://trykob.com";

const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "GOOGLE_PLACES_API_KEY",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
];

const productionOnly = [
  "INNGEST_SIGNING_KEY",
  "INNGEST_EVENT_KEY",
  "OUTBOUND_WORKSPACE_RESTAURANT_ID",
  "HUNTER_API_KEY",
];

let failed = false;

console.log(`\nKOB launch check${production ? " (production strict)" : ""}\n`);
console.log(`Target domain: ${domain}\n`);

console.log("── Environment (.env.local) ──\n");

for (const key of required) {
  const val = env[key]?.trim();
  if (val) {
    const hint = key.includes("URL") || key.includes("EMAIL") ? ` → ${val}` : "";
    console.log(`  ✓ ${key}${hint}`);
  } else {
    console.log(`  ✗ ${key} (missing)`);
    failed = true;
  }
}

if (production) {
  console.log("\n── Production-only ──\n");
  for (const key of productionOnly) {
    if (env[key]?.trim()) {
      console.log(`  ✓ ${key}`);
    } else {
      console.log(`  ✗ ${key} (required for launch)`);
      failed = true;
    }
  }
} else {
  console.log("\n── Production-only (set before go-live) ──\n");
  for (const key of productionOnly) {
    console.log(`  ${env[key]?.trim() ? "✓" : "○"} ${key}`);
  }
}

const appUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
if (appUrl && !appUrl.includes("trykob.com") && production) {
  console.log(`\n  ⚠ NEXT_PUBLIC_APP_URL is ${appUrl} — use https://trykob.com on Netlify`);
  failed = true;
}

const from = env.RESEND_FROM_EMAIL || "";
if (from.includes("onboarding@resend.dev") && production) {
  console.log("\n  ⚠ RESEND_FROM_EMAIL still uses resend.dev — verify trykob.com in Resend first");
  failed = true;
}
if (from.includes("trykob.com")) {
  console.log("\n  ✓ Resend from-address uses trykob.com");
}

const dbUrl = env.DATABASE_URL ?? "";
if (dbUrl.includes("GOCSPX-") || dbUrl.includes("AIza")) {
  console.log("\n  ✗ DATABASE_URL password looks wrong (Google OAuth key, not Supabase DB password)");
  console.log("    Fix: Supabase → Settings → Database → copy password → SUPABASE_DB_PASSWORD in .env.local");
  console.log("    Then: npm run supabase:sync-env && npm run db:migrate");
  failed = true;
}

console.log(`
── Paste into Netlify (Site → Environment variables) ──

  NEXT_PUBLIC_APP_URL=${domain}
  NEXT_PUBLIC_SITE_URL=${domain}
  NETLIFY_PRODUCTION_URL=${domain}
  RESEND_FROM_EMAIL=KOB <hello@trykob.com>
  RESEND_AUTH_FROM_EMAIL=KOB <hello@trykob.com>

── After deploy ──

  1. npm run db:migrate          (RLS + schema on production DB)
  2. Inngest → sync ${domain}/api/inngest
  3. Supabase Security Advisor → Rerun linter (0 RLS errors)
  4. npm run smoke:check -- --url ${domain}

Full checklist: docs/LAUNCH.md
`);

if (failed) {
  console.error("Launch check: fix missing items above.\n");
  process.exit(1);
}

console.log("Launch check passed.\n");
