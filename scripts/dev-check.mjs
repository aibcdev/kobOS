#!/usr/bin/env node
/**
 * Quick local dev readiness. Run: npm run dev:check
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
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
let ok = true;

function check(name, present, hint) {
  if (present) {
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name} — ${hint}`);
    ok = false;
  }
}

check("DATABASE_URL", Boolean(env.DATABASE_URL), "run: npm run supabase:sync-env");
check(
  "INNGEST_DEV",
  env.INNGEST_DEV === "1" || env.INNGEST_DEV === "true",
  "add INNGEST_DEV=1 to .env.local, then restart dev:public",
);
if (env.BROWSERBASE_API_KEY?.trim() && env.BROWSERBASE_PROJECT_ID?.trim()) {
  console.log("✅ BROWSERBASE (optional — restaurant audits)");
} else {
  console.log("⚠️  BROWSERBASE — optional; Owner crawl: npm run crawl:owner:free");
}

console.log("");
if (ok) {
  console.log("Ready. Terminals:");
  console.log("  1) npm run dev:public:reset");
  console.log("  2) npm run inngest:dev");
} else {
  process.exit(1);
}
