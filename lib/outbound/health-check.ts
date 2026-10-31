/**
 * The per-prospect "Google health check" (Owner.com's grader, done by hand) and the problem-hook emails built on it.
 *
 * Only real facts go in: what Google's listing shows, plus what Tim checks by hand. Google's Places API doesn't return
 * owner replies, so "reviews without a reply" is a count Tim makes on Maps, never an estimate. Places also returns its
 * five "most relevant" reviews, not the newest, so nothing here claims a review trend or recency.
 */

export type GoogleListingFacts = {
  placeId: string;
  name: string;
  address: string | null;
  businessStatus: string | null;
  rating: number | null;
  reviewCount: number | null;
  sampleReviews: Array<{ rating: number | null; publishTime: string | null; text: string }>;
  /** Places returns at most 10 photo references, so 10 means "10 or more". */
  photoCount: number;
  /** "Monday: 12:00 – 22:00" lines, as Google shows them. */
  hours: string[];
  websiteUri: string | null;
  mapsUri: string | null;
};

/** What Tim checked on Google Maps himself. */
export type ManualChecks = {
  /** Reviews from the last 90 days without "Response from the owner". */
  unansweredRecent?: number;
  /** Google's hours don't match the website (Tim compared them). */
  hoursMismatch?: string;
  firstName?: string;
};

export type Finding = { key: string; line: string; why: string };

const PHOTO_CAP = 10;

/** Problems we can state as fact, most useful hook first. */
export function findings(facts: GoogleListingFacts, manual: ManualChecks = {}): Finding[] {
  const out: Finding[] = [];
  const name = facts.name || "your restaurant";
  if (manual.unansweredRecent && manual.unansweredRecent > 0) {
    const n = manual.unansweredRecent;
    out.push({
      key: "unanswered",
      line: `${n} of ${name}'s Google reviews from the last few months ${n === 1 ? "doesn't" : "don't"} have a reply yet`,
      why: "Guests read the replies as much as the reviews when they're choosing where to eat.",
    });
  }
  if (manual.hoursMismatch) {
    out.push({
      key: "hours_mismatch",
      line: `${name}'s hours on Google don't match your website (${manual.hoursMismatch})`,
      why: "When the two disagree, guests turn up to a closed door or go somewhere else.",
    });
  }
  if (facts.businessStatus && facts.businessStatus !== "OPERATIONAL") {
    out.push({
      key: "status",
      line: `Google lists ${name} as ${facts.businessStatus === "CLOSED_TEMPORARILY" ? "temporarily closed" : "closed"}`,
      why: "Guests who see that on Maps don't come.",
    });
  }
  if (!facts.hours.length) {
    out.push({
      key: "no_hours",
      line: `${name}'s Google listing doesn't show opening hours`,
      why: "Hours are the first thing most guests check on Maps.",
    });
  }
  if (!facts.websiteUri) {
    out.push({
      key: "no_website",
      line: `${name}'s Google listing doesn't link to your website`,
      why: "Guests who want the menu or to book have nowhere to go.",
    });
  }
  if (facts.photoCount < PHOTO_CAP) {
    out.push({
      key: "few_photos",
      line: `${name}'s Google listing only has ${facts.photoCount} photo${facts.photoCount === 1 ? "" : "s"}`,
      why: "Guests pick from the photos before they read anything.",
    });
  }
  return out;
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "date not shown");

/** The one-pager Tim sends (or pastes into the reply). Markdown. */
export function healthCheckMarkdown(facts: GoogleListingFacts, manual: ManualChecks = {}, checkedOn = new Date()): string {
  const f = findings(facts, manual);
  const rating = facts.rating != null ? `${facts.rating.toFixed(1)}★ from ${facts.reviewCount ?? 0} reviews` : "No rating yet";
  const lines = [
    `# Google health check: ${facts.name}`,
    `${facts.address ?? ""}`.trim(),
    `Checked ${checkedOn.toISOString().slice(0, 10)} from the public Google listing${manual.unansweredRecent != null || manual.hoursMismatch ? " and by hand" : ""}.`,
    "",
    "## What needs a look",
    ...(f.length ? f.map((x) => `- **${x.line}.** ${x.why}`) : ["- Nothing obvious from the listing itself. The reviews still need a by-hand look (below)."]),
    "",
    "## The listing",
    `- Rating: ${rating}`,
    `- Reviews with no reply (last 90 days): ${manual.unansweredRecent != null ? manual.unansweredRecent : "not checked yet"}`,
    `- Photos: ${facts.photoCount >= PHOTO_CAP ? `${PHOTO_CAP} or more` : facts.photoCount}`,
    `- Website on listing: ${facts.websiteUri ?? "none"}`,
    `- Hours on Google: ${facts.hours.length ? "" : "none shown"}`,
    ...facts.hours.map((h) => `  - ${h}`),
    "",
    "## Reviews Google shows first",
    ...(facts.sampleReviews.length
      ? facts.sampleReviews.map((r) => `- ${r.rating ?? "?"}★ (${day(r.publishTime)}): ${r.text || "(no text)"}`)
      : ["- None shown"]),
    "",
    "_Google shows its most relevant reviews here, not the newest._",
  ];
  return lines.join("\n");
}

/** By-hand steps for Tim before sending, so nothing is guessed. */
export function manualChecklist(facts: GoogleListingFacts): string[] {
  return [
    `Open ${facts.mapsUri ?? "the listing on Google Maps"}, sort reviews by Newest, and count reviews from the last 90 days with no "Response from the owner". Pass it as --unanswered.`,
    `Compare Google's hours with ${facts.websiteUri ?? "the website"}. If they differ, pass --hours-mismatch "Google says X, website says Y".`,
  ];
}

const FOOTER = `\n\n—\nIf you'd rather not hear from us, reply "unsubscribe" and we won't follow up.`;

export type Draft = { step: number; sendAfterDays: number; subject: string; body: string; note: string };

/**
 * A short, useful sequence (Owner.com's founder needed seven touches; each of ours gives something). No price, no
 * link in the first email: the ask is a reply. Returns null when there's no real problem to lead with — don't send.
 */
export function problemHookSequence(facts: GoogleListingFacts, manual: ManualChecks = {}, sender = "Tim"): Draft[] | null {
  const f = findings(facts, manual);
  if (!f.length) return null;
  const hook = f[0];
  const name = facts.name;
  const hi = `Hi ${manual.firstName?.trim() || "there"},`;
  const sign = `\n\n${sender}\nKOB`;
  const rest = f.slice(1, 3);
  return [
    {
      step: 1,
      sendAfterDays: 0,
      subject: hook.key === "unanswered" ? `${name}'s Google reviews` : `Quick one about ${name} on Google`,
      body: `${hi}\n\nI noticed ${hook.line}. ${hook.why}\n\nWant me to send over a free check of ${name}'s Google profile? It covers reviews waiting for a reply, hours, photos and anything else that looks off. Takes me a few minutes.${sign}${FOOTER}`,
      note: "Reply ask only. If they say yes, send the health check (step 2) straight away.",
    },
    {
      step: 2,
      sendAfterDays: 3,
      subject: `Free Google check for ${name}`,
      body: `${hi}\n\nI went ahead and did the check anyway, in case it's useful. The short version:\n\n- ${[hook, ...rest].map((x) => `${x.line}.`).join("\n- ")}\n\nHappy to send the full page if you'd like it.${sign}${FOOTER}`,
      note: "Useful follow-up, not a bump. Attach or paste the health check if they asked for it.",
    },
    {
      step: 3,
      sendAfterDays: 7,
      subject: `Re: Free Google check for ${name}`,
      body: `${hi}\n\nOne thing owners ask before trying KOB: will the replies sound like me, and will anything go out without me?\n\nKOB drafts each reply and listing fix in your tone, and holds anything awkward for you. Nothing goes out until you approve it and post it in one tap.\n\nIf you'd like to see it on ${name}, it's 7 days free, no card.${sign}${FOOTER}`,
      note: "Answers the fear. No price unless they ask (use PRICE_REPLY).",
    },
    {
      step: 4,
      sendAfterDays: 12,
      subject: `Re: Free Google check for ${name}`,
      body: `${hi}\n\nI'll leave it here so I'm not cluttering your inbox. If reviews or Google hours ever become a headache, reply to this and I'll send the check.${sign}${FOOTER}`,
      note: "Last touch. Stop the sequence after this or on any reply.",
    },
  ];
}

/** Only when they ask about price. Owner.com figures from owner.com/pricing, checked 28 Oct 2026. */
export const PRICE_REPLY =
  "After the 7-day free trial (no card), KOB is $99 a month per location, or £79 in the UK. For comparison, Owner.com's published plans start at $249 a month plus a 5% fee per order.";
