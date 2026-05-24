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

const recommended = ["GEMINI_API_KEY"];

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

for (const key of recommended) {
  if (env[key]?.trim()) {
    console.log(`  ✓ ${key}`);
  } else {
    console.log(`  ○ ${key} (optional — audits skip Gemini without it)`);
  }
}

const urlArg = process.argv.find((a) => a.startsWith("--url="))?.slice(6) ||
  (process.argv.includes("--url") ? process.argv[process.argv.indexOf("--url") + 1] : null);

if (urlArg) {
  const base = urlArg.replace(/\/$/, "");
  console.log(`\nKOB smoke check — HTTP (${base})\n`);
  for (const path of ["/", "/audit", "/api/inngest"]) {
    try {
      const res = await fetch(`${base}${path}`, { method: path === "/api/inngest" ? "GET" : "GET" });
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
  1. Run a visibility audit at ${base}/audit
  2. Supabase → VisibilityAudit table has a new row
  3. With Inngest connected, scores update from pending → ready
  4. Magic link login at ${base}/login (Supabase redirect URLs must include ${base}/auth/callback)
`);
}

if (failed) {
  process.exit(1);
}

console.log("\nEnvironment OK.\n");
