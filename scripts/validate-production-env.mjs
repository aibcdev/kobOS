const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "INNGEST_SIGNING_KEY",
  "INNGEST_EVENT_KEY",
  "OPS_ALERT_EMAIL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_PRO",
  "GOOGLE_PLACES_API_KEY",
  "CRON_SECRET",
];

const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Missing production environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
if (process.env.NEXT_PUBLIC_UI_PREVIEW === "1") {
  console.error("NEXT_PUBLIC_UI_PREVIEW must never be enabled in production.");
  process.exit(1);
}
console.log("Production environment validation passed.");
