import { OutboundEmailVariant } from "@prisma/client";

export type OutboundAbDraft = {
  variant: OutboundEmailVariant;
  email_subject: string;
  message_body: string;
  suggested_tone: string;
};

function senderName(): string {
  return process.env.OUTBOUND_SENDER_NAME?.trim() || "Tim";
}

function complianceFooter(): string {
  return `\n\n—\nIf you'd rather not hear from us, reply "unsubscribe" and we won't follow up.`;
}

/** Stable 50/50 A/B from any string id (lead id preferred). */
export function assignOutboundEmailVariant(stableId: string): OutboundEmailVariant {
  let hash = 0;
  for (let i = 0; i < stableId.length; i++) {
    hash = (hash * 31 + stableId.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? OutboundEmailVariant.A : OutboundEmailVariant.B;
}

function fillTemplateA(companyName: string, auditUrl: string): { subject: string; body: string } {
  const subject = `We found something on ${companyName}'s website`;
  const body = `Hi,

I was looking at ${companyName} earlier and noticed a few things that could be sending potential customers to nearby restaurants instead.

Nothing looked catastrophic—most are quick fixes—but they're exactly the kind of things people notice before deciding where to eat.

So we put together a free report that checks your:

Google listing
Reviews
Website
Photos
Local competitors

...and highlights the biggest opportunities to win more customers.

It takes about a minute:

${auditUrl}

Hope it's useful.

${senderName()}
KOB`;
  return { subject, body };
}

function fillTemplateB(companyName: string, auditUrl: string): { subject: string; body: string } {
  const subject = companyName;
  const body = `Hi,

I ran a quick check on ${companyName} and found a few things online that could be costing you customers.

I put the report here:

${auditUrl}

It takes about a minute to read and highlights the biggest opportunities across your website, Google listing and reviews.

Hope it helps.

${senderName()}`;
  return { subject, body };
}

/** Deterministic Email A / Email B — no LLM. */
export function buildOutboundAbDraft(input: {
  stableId: string;
  companyName: string;
  auditUrl: string;
  variant?: OutboundEmailVariant;
}): OutboundAbDraft {
  const variant = input.variant ?? assignOutboundEmailVariant(input.stableId);
  const companyName = input.companyName.trim() || "your restaurant";
  const auditUrl = input.auditUrl.trim();
  const filled =
    variant === OutboundEmailVariant.A
      ? fillTemplateA(companyName, auditUrl)
      : fillTemplateB(companyName, auditUrl);

  return {
    variant,
    email_subject: filled.subject,
    message_body: filled.body.trim() + complianceFooter(),
    suggested_tone: variant === OutboundEmailVariant.A ? "ab_template_a" : "ab_template_b",
  };
}
