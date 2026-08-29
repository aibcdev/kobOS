/**
 * Print (or dry-run) the G2/Capterra/Product Hunt ask.
 *
 *   npx tsx scripts/outbound-review-ask.ts --name "The Oak" --email owner@venue.com
 */
import { reviewAskEmail, REVIEW_ASK_PLAYBOOK } from "../lib/marketing/review-ask-email";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const name = arg("--name") || "there";
  const email = arg("--email");
  const draft = reviewAskEmail(name);
  console.log(REVIEW_ASK_PLAYBOOK);
  console.log("To:", email || "(paste owner email)");
  console.log("Subject:", draft.subject);
  console.log("---");
  console.log(draft.body);

  const key = process.env.RESEND_API_KEY?.trim();
  const apply = process.env.OUTBOUND_REVIEW_ASK_SEND === "1";
  if (apply && key && email) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.OUTBOUND_FROM_EMAIL?.trim() || "KOB <hello@trykob.com>",
        to: [email],
        subject: draft.subject,
        text: draft.body,
      }),
    });
    console.log("sent", res.status);
  } else {
    console.log("Dry run. Set OUTBOUND_REVIEW_ASK_SEND=1 with RESEND_API_KEY and --email to send.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
