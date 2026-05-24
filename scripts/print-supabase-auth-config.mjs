#!/usr/bin/env node
/**
 * Prints Supabase Auth URL settings to paste into the hosted dashboard.
 * Run: npm run setup:auth-urls
 * Reads NEXT_PUBLIC_APP_URL from .env.local (via dotenv) when set.
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
    out[key] = val;
  }
  return out;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const appUrl = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const netlifyHint = env.NETLIFY_PRODUCTION_URL?.replace(/\/$/, "");

console.log(`
Supabase → Authentication → URL configuration
============================================

Site URL (primary live site):
  ${netlifyHint || appUrl}

Redirect URLs — add each line (keep localhost for dev):
  http://localhost:3000/auth/callback
  http://127.0.0.1:3000/auth/callback
${netlifyHint ? `  ${netlifyHint}/auth/callback` : "  https://YOUR-SITE.netlify.app/auth/callback  ← replace with your Netlify URL"}

Optional wildcard (if your project allows **):
  http://localhost:3000/**
${netlifyHint ? `  ${netlifyHint}/**` : "  https://YOUR-SITE.netlify.app/**"}

Tip: set NETLIFY_PRODUCTION_URL=https://your-site.netlify.app in .env.local
     then re-run: npm run setup:auth-urls
`);
