import { OutboundLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isValidProspectEmail } from "@/lib/outbound/validate-prospect-email";

/** Normalize outbound email for dedupe (trim, lower, strip leading %20 / spaces). */
export function normalizeOutboundEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  let e = email.trim().toLowerCase();
  // URL-encoded / literal leading whitespace from bad scrapes
  while (e.startsWith("%20") || e.startsWith("+")) {
    e = e.slice(3).trimStart();
  }
  e = e.replace(/^\s+/, "");
  if (!e.includes("@") || e.includes(" ")) return null;
  return e;
}

export type SentContactSets = {
  emails: Set<string>;
  placeIds: Set<string>;
};

export async function loadSentContactSets(workspaceRestaurantId: string): Promise<SentContactSets> {
  const rows = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId,
      status: OutboundLeadStatus.SENT,
      OR: [{ contactEmail: { not: null } }, { placeId: { not: null } }],
    },
    select: { contactEmail: true, placeId: true },
  });
  const emails = new Set<string>();
  const placeIds = new Set<string>();
  for (const r of rows) {
    const e = normalizeOutboundEmail(r.contactEmail);
    if (e) emails.add(e);
    if (r.placeId?.trim()) placeIds.add(r.placeId.trim());
  }
  return { emails, placeIds };
}

export function isAlreadyContacted(
  lead: { contactEmail?: string | null; placeId?: string | null; websiteUrl?: string | null },
  sent: SentContactSets,
): { skip: true; reason: string } | { skip: false; email: string } {
  const email = normalizeOutboundEmail(lead.contactEmail);
  if (!email) return { skip: true, reason: "bad_email" };
  const valid = isValidProspectEmail(email, lead.websiteUrl ?? null);
  if (!valid.ok) return { skip: true, reason: valid.reason };
  if (sent.emails.has(email)) return { skip: true, reason: "email_already_sent" };
  if (lead.placeId?.trim() && sent.placeIds.has(lead.placeId.trim())) {
    return { skip: true, reason: "place_already_sent" };
  }
  return { skip: false, email };
}

/** Keep first occurrence of each email; drop already-sent / invalid. */
export function pickUniqueFreshLeads<
  T extends {
    id: string;
    contactEmail?: string | null;
    placeId?: string | null;
    websiteUrl?: string | null;
    messageBody?: string | null;
  },
>(leads: T[], sent: SentContactSets, limit: number): { picked: T[]; skipped: Record<string, number> } {
  const skipped: Record<string, number> = {};
  const bump = (k: string) => {
    skipped[k] = (skipped[k] ?? 0) + 1;
  };
  const seenEmails = new Set<string>();
  const seenPlaces = new Set<string>();
  const picked: T[] = [];

  for (const lead of leads) {
    if (picked.length >= limit) break;
    if (!lead.messageBody?.includes("/audit/")) {
      bump("no_audit_url");
      continue;
    }
    const check = isAlreadyContacted(lead, sent);
    if (check.skip) {
      bump(check.reason);
      continue;
    }
    if (seenEmails.has(check.email)) {
      bump("dup_email_in_batch");
      continue;
    }
    const place = lead.placeId?.trim();
    if (place && seenPlaces.has(place)) {
      bump("dup_place_in_batch");
      continue;
    }
    seenEmails.add(check.email);
    if (place) seenPlaces.add(place);
    // Mark as reserved so later promote/send in same process won't double
    sent.emails.add(check.email);
    if (place) sent.placeIds.add(place);
    picked.push(lead);
  }

  return { picked, skipped };
}
