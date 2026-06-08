#!/usr/bin/env node
/**
 * Diagnose "Error sending magic link email" from Supabase.
 * Run: npm run auth:test-email
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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
const resend = env.RESEND_API_KEY;
const origin = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

console.log("\nKOB auth email check\n====================\n");
console.log("Supabase URL:", url ? "set" : "MISSING");
console.log("Anon key:", key ? "set" : "MISSING");
console.log("Service role:", serviceRole ? "set" : "MISSING (needed for Resend backup)");
console.log("Resend API key:", resend ? "set" : "MISSING");
console.log("Auth origin:", origin);

if (!url || !key) {
  console.log("\nFix: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n");
  process.exit(1);
}

const testEmail = process.env.TEST_AUTH_EMAIL || "test@example.com";
const res = await fetch(`${url}/auth/v1/otp`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: testEmail,
    options: { email_redirect_to: `${origin}/auth/confirm`, should_create_user: true },
  }),
});

const text = await res.text();
console.log("\nSupabase send test:", res.status, text.slice(0, 200));

if (res.status === 500) {
  console.log(`
Supabase cannot send email (broken SMTP or email template).

Fix in Supabase Dashboard:
  1. Authentication → SMTP → turn OFF custom SMTP (test), OR fix Resend SMTP:
     Host smtp.resend.com | User resend | Password = your Resend API key
     Sender must match Resend (e.g. onboarding@resend.dev)
  2. Authentication → Email Templates → Magic Link → Reset to default, Save
  3. Logs → Auth for the exact error

App backup (recommended):
  Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Settings → API → service_role secret)
  Login will send via Resend instead of Supabase SMTP.
`);
}

if (serviceRole && resend) {
  console.log("Resend backup: configured — login page can use /api/auth/send-magic-link\n");
} else {
  console.log("Resend backup: not ready — add SUPABASE_SERVICE_ROLE_KEY + RESEND_API_KEY\n");
}
