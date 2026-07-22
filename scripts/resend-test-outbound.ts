#!/usr/bin/env npx tsx
/** Send a test outbound email via Resend to OUTBOUND_RESEND_NOTIFY_EMAIL. */

import { sendOutboundEmailViaResend } from "@/lib/outbound/send-resend-outbound-email";

async function main() {
  const key = process.env.RESEND_API_KEY?.trim();
  const to = process.env.OUTBOUND_RESEND_NOTIFY_EMAIL?.trim();
  if (!key) {
    console.error("Set RESEND_API_KEY in .env.local");
    process.exit(1);
  }
  if (!to) {
    console.error("Set OUTBOUND_RESEND_NOTIFY_EMAIL in .env.local");
    process.exit(1);
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "(not set)";
  console.log(`From: ${from}`);
  console.log(`To: ${to}`);

  const result = await sendOutboundEmailViaResend(key, {
    to,
    subject: "KOB outbound test — deliverability check",
    body: [
      "Hi — this is a test from KOB outbound.",
      "",
      "If this landed in your inbox (not spam), Resend is set up correctly.",
      "",
      "Reply to this email to confirm replies work.",
    ].join("\n"),
  });

  if (!result.ok) {
    console.error("Send failed:", result.error);
    process.exit(1);
  }
  console.log("Test email sent. Check your inbox (and spam folder).");
}

main();
