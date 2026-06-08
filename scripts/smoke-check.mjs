#!/usr/bin/env node
/**
 * Pre/post deploy smoke checks (env + optional live HTTP).
 * Run: npm run smoke:check
 * Live: npm run smoke:check -- --url https://your-site.netlify.app
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

const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const auditRequired = ["GOOGLE_PLACES_API_KEY", "GEMINI_API_KEY"];

const inngestRecommended = ["INNGEST_SIGNING_KEY", "INNGEST_EVENT_KEY"];

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
let failed = false;

console.log("KOB smoke check — environment\n");

for (const key of required) {
  if (env[key]?.trim()) {
    console.log(`  ✓ ${key}`);
  } else {
    console.log(`  ✗ ${key} (missing)`);
    failed = true;
  }
}

console.log("\nAudit funnel (required for UK launch):\n");
for (const key of auditRequired) {
  if (env[key]?.trim()) {
    console.log(`  ✓ ${key}`);
  } else {
    console.log(`  ✗ ${key} (missing — /api/audit/start returns 503)`);
    failed = true;
  }
}

console.log("\nBackground jobs:\n");
for (const key of inngestRecommended) {
  if (env[key]?.trim()) {
    console.log(`  ✓ ${key}`);
  } else {
    console.log(`  ○ ${key} (optional locally if npm run dev:audit; required in production)`);
  }
}

const urlArg =
  process.argv.find((a) => a.startsWith("--url="))?.slice(6) ||
  (process.argv.includes("--url") ? process.argv[process.argv.indexOf("--url") + 1] : null);

const httpPaths = ["/", "/audit", "/login", "/auth/confirm", "/pricing", "/privacy", "/api/inngest"];

if (urlArg) {
  const base = urlArg.replace(/\/$/, "");
  console.log(`\nKOB smoke check — HTTP (${base})\n`);
  for (const path of httpPaths) {
    try {
      const res = await fetch(`${base}${path}`, { method: "GET" });
      const ok = res.status < 500;
      console.log(`  ${ok ? "✓" : "✗"} GET ${path} → ${res.status}`);
      if (!ok) failed = true;
    } catch (e) {
      console.log(`  ✗ GET ${path} → ${e instanceof Error ? e.message : "failed"}`);
      failed = true;
    }
  }
  console.log(`
Manual checks on ${base}:
  1. Run a UK visibility audit at ${base}/audit (pick restaurant from Google dropdown)
  2. Confirm competitors show real venue names (not estimated placeholders)
  3. Supabase → VisibilityAudit has a new row; benchmark moves pending → ready (Inngest)
  4. Login / magic link on production URL (Supabase redirect ${base}/** and /auth/confirm)
  5. npm run audit:golden-path -- (with AUDIT_GOLDEN_BASE_URL=${base}) after deploy
`);
}

if (failed) {
  console.error("\nSmoke check failed.\n");
  process.exit(1);
}

console.log("\nSmoke check passed.\n");
