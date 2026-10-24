import { prisma } from "@/lib/db/prisma";
import type { Generate } from "@/lib/connectors/gbp/drafter";
import { templateReviewReply } from "@/lib/connectors/gbp/drafter";
import { formatLocalDate, nextMothersDay } from "@/lib/locale/holidays";
import { googleReviewLink, reviewAskMessage } from "@/lib/reviews/review-kit";
import { nightsProfile, setMenuPrice, setNights, spendPerHead, type Weekday } from "@/lib/venue/nights";

/** Talk's day codes (MON…) are the same three letters the nights profile uses. */
const WEEKDAY_TO_NIGHT: Record<string, Weekday> = { MON: "MON", TUE: "TUE", WED: "WED", THU: "THU", FRI: "FRI", SAT: "SAT", SUN: "SUN" };
import { draftReplyForReview, type ReplyDraft } from "@/lib/agent/review-reply";
import { DAYS, LISTING_FACT, lastSnapshot, sameHours, saveWebsiteHours, websiteHours, type Day, type HoursPeriod, type ListingSnapshot } from "@/lib/connectors/gbp/listing";
import { proposeHoursUpdate } from "@/lib/connectors/gbp/listing-sync";
import {
  findReview,
  googleConnection,
  houseRules,
  latestBrief,
  loadProfile,
  localDay,
  noDiscountDays,
  pendingApprovals,
  periodStart,
  planStatus,
  reviewSummary,
  saveHouseRule,
  starsMentioned,
  type Profile,
} from "./restaurant-facts";
import type { TalkActivity } from "./types";

/**
 * Answers the questions owners ask most, straight from the restaurant's own data, for when the language service is
 * unavailable. It never invents numbers, guests or work, and never publishes anything.
 */

export type FactAnswer = { text: string; activity: TalkActivity[]; intent: string };

type Ctx = { restaurantId: string; userId: string | null; now: Date; profile: Profile; generate?: Generate };

const WEEKDAY: Record<string, { label: string; code: string }> = {
  monday: { label: "Monday", code: "MON" },
  tuesday: { label: "Tuesday", code: "TUE" },
  wednesday: { label: "Wednesday", code: "WED" },
  thursday: { label: "Thursday", code: "THU" },
  friday: { label: "Friday", code: "FRI" },
  saturday: { label: "Saturday", code: "SAT" },
  sunday: { label: "Sunday", code: "SUN" },
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const stars = (n: number) => `${n}-star`;

function money(amount: number, currency: string, locale = "en-GB") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function replyBlock(d: ReplyDraft): string {
  const who = d.reviewer ? `${d.reviewer}'s ${stars(d.rating)} review` : `the ${stars(d.rating)} review`;
  const where =
    d.placed === "approval"
      ? "It's waiting in Needs you. Nothing is posted until you approve it, and KOB checks Google shows it afterwards."
      : `Draft — not posted. ${d.reason ?? ""}`.trim();
  return `Here's a reply to ${who}:\n\n"${d.text}"\n\n${where}`;
}

async function reviewsThisWeek(c: Ctx): Promise<FactAnswer> {
  const weekStart = periodStart("week", c.profile.timezone, c.now);
  const s = await reviewSummary(c.restaurantId, weekStart, c.now);
  const lastWeek = await reviewSummary(c.restaurantId, new Date(weekStart.getTime() - 7 * 86_400_000), weekStart);
  if (!s.allTime.count)
    return {
      intent: "reviews_week",
      text: "I don't have any of your reviews yet. Connect your Google listing and KOB will bring them in, then draft a reply to each one for you to approve.",
      activity: [{ label: "Checked your reviews", status: "complete" }],
    };
  const lines = [
    s.count
      ? `This week: ${plural(s.count, "new review")}${s.average ? `, averaging ${s.average} stars` : ""} (last week: ${lastWeek.count}).`
      : "No new reviews so far this week.",
    s.unrepliedTotal ? `${plural(s.unrepliedTotal, "review")} still ${s.unrepliedTotal === 1 ? "needs" : "need"} a reply.` : "Every review has a reply.",
  ];
  const worst = s.worstUnreplied.find((r) => r.rating <= 3);
  if (worst)
    lines.push(
      `Start with ${worst.reviewer ? `${worst.reviewer}'s` : "the"} ${stars(worst.rating)}: "${worst.excerpt}". Say "reply to the ${worst.rating}-star" and I'll draft it for your approval.`,
    );
  else if (s.unrepliedTotal) lines.push(`Say "reply to the latest review" and I'll draft it for your approval.`);
  return { intent: "reviews_week", text: lines.join(" "), activity: [{ label: "Checked your reviews", status: "complete" }] };
}

async function reviewCount(c: Ctx, period: "month" | "last_month" | "week"): Promise<FactAnswer> {
  const since = periodStart(period, c.profile.timezone, c.now);
  const until = period === "last_month" ? periodStart("month", c.profile.timezone, c.now) : c.now;
  const s = await reviewSummary(c.restaurantId, since, until);
  const label = period === "week" ? "this week" : period === "month" ? "this month" : "last month";
  const split = s.byRating.filter((r) => r.count).reverse().map((r) => `${r.count}× ${r.stars}★`).join(", ");
  return {
    intent: "review_count",
    text: s.count
      ? `${plural(s.count, "review")} ${label}${s.average ? `, averaging ${s.average} stars` : ""} (${split}). All time: ${s.allTime.count}${s.allTime.average ? ` at ${s.allTime.average} stars` : ""}.`
      : `No reviews ${label} in what KOB has synced. All time: ${s.allTime.count}.`,
    activity: [{ label: "Counted your reviews", status: "complete" }],
  };
}


async function replyToReview(c: Ctx, text: string): Promise<FactAnswer> {
  const rating = starsMentioned(text);
  const about = text.replace(/^.*?\b(about|said|says|saying)\b/i, "");
  const review = await findReview(c.restaurantId, { rating, text: about === text ? text : about });
  if (!review) {
    // The guest's comment isn't in the synced reviews (e.g. told in person): draft text only.
    const draft = templateReviewReply({ restaurantName: c.profile.name, reviewerName: null, rating: rating ?? 2 });
    return {
      intent: "reply_review",
      text: `I couldn't find that review in what KOB has synced, so here's a reply you can use:\n\n"${draft}"\n\nDraft — not posted.`,
      activity: [{ label: "Searched your reviews", status: "complete" }],
    };
  }
  const d = await draftReplyForReview(c.restaurantId, review, c.userId, { generate: c.generate, now: c.now });
  return { intent: "reply_review", text: replyBlock(d), activity: [{ label: "Drafted a review reply", status: "complete" }] };
}

async function saveRule(c: Ctx, text: string): Promise<FactAnswer> {
  const ruleText = text.replace(/^(please\s+)?(learn|remember|save|note)\s+(this\s+)?(house\s+)?rule:?\s*/i, "").trim() || text.trim();
  const { rule, created } = await saveHouseRule(c.restaurantId, ruleText, c.userId);
  const effect =
    rule.ruleType === "never_discount_day" && rule.day
      ? " Offers KOB suggests will never discount that day."
      : rule.ruleType === "never_comp_day"
        ? " Drafts and offers will follow it."
        : " Drafts will follow it.";
  return {
    intent: "house_rule",
    text: `${created ? "Saved" : "Already saved"} as a house rule: "${rule.text}".${effect}`,
    activity: [{ label: "Saved a house rule", status: "complete" }],
  };
}

async function quietNight(c: Ctx, dayKey: string): Promise<FactAnswer> {
  const day = WEEKDAY[dayKey];
  const code = WEEKDAY_TO_NIGHT[day.code];
  const nights = await nightsProfile(c.restaurantId, c.now);
  const blocked = nights.protectedDays.includes(code);
  if (!blocked) await setNights(c.restaurantId, "quiet", [code], c.now);
  const price = setMenuPrice(spendPerHead(c.profile.pricePoint));
  const set = price ? new Intl.NumberFormat("en-GB", { style: "currency", currency: c.profile.currency, maximumFractionDigits: 0 }).format(price) : null;
  const ideas = blocked
    ? [`a ${day.label} chef's table or tasting night at full price`, `a regulars' night: personal invites to past guests, no discount`]
    : [
        set ? `a ${day.label} set menu: two courses for ${set}` : `a ${day.label} set menu (two courses, one fixed price — tell me the price)`,
        `dessert on us for tables seated before 7pm on ${day.label}s`,
        `bring-a-friend: their main half price, ${day.label}s only`,
      ];
  const post = `${day.label}s at ${c.profile.name}: ${blocked ? "a night worth booking for" : "a little something to make the week better"}. Book your table${c.profile.city ? ` in ${c.profile.city}` : ""} — we'd love to see you.`;
  return {
    intent: "quiet_night",
    text: [
      blocked ? `You've marked ${day.label}s as busy or never to discount, so these keep full price:` : `Noted: ${day.label}s are quiet. Ideas in ${c.profile.currency}:`,
      ...ideas.map((i) => `• ${i}`),
      `A post to go with it:\n\n"${post}"\n\nDraft — not posted. KOB will also suggest ${day.label} offers in Offers for you to approve.`,
    ].join("\n"),
    activity: [{ label: blocked ? "Checked your house rules" : "Noted a quiet night", status: "complete" }],
  };
}

async function busyNight(c: Ctx, dayKey: string): Promise<FactAnswer> {
  const day = WEEKDAY[dayKey];
  await setNights(c.restaurantId, "busy", [WEEKDAY_TO_NIGHT[day.code]], c.now);
  return {
    intent: "busy_night",
    text: `Noted: ${day.label}s are busy. KOB will never suggest a discount on a ${day.label}.`,
    activity: [{ label: "Noted a busy night", status: "complete" }],
  };
}

async function socialPost(c: Ctx, text: string): Promise<FactAnswer> {
  const dish = text.match(/\bfor (?:our |the )?(?:new )?(.+?)[.?!]*$/i)?.[1]?.trim() ?? "our latest dish";
  const post = `New on the menu at ${c.profile.name}: ${dish}. Come and try it${c.profile.city ? ` in ${c.profile.city}` : ""} — book your table today.`;
  return {
    intent: "social_post",
    text: `Here's an Instagram post:\n\n"${post}"\n\nDraft — not posted. KOB can't post to Instagram yet, so copy it across when you're happy with it.`,
    activity: [],
  };
}

async function mothersDayOffer(c: Ctx): Promise<FactAnswer> {
  const { date: today } = localDay(c.profile.timezone, c.now);
  const date = nextMothersDay(c.profile.countryCode, today);
  const blocked = await noDiscountDays(c.restaurantId);
  const when = formatLocalDate(date);
  return {
    intent: "mothers_day",
    text: `Mother's Day is ${when}. A draft offer:\n\n"Treat Mum at ${c.profile.name} this Mother's Day — a set lunch for the table and a glass of bubbles for every mum. Book now, tables go fast."\n\nDraft — not posted. Give me the set-lunch price in ${c.profile.currency} and I'll add it.${blocked.includes("SUN") ? " (You've told me never to discount Sundays, so this keeps full price.)" : ""}`,
    activity: [],
  };
}

const NOT_CONNECTED =
  "Your Google listing isn't connected yet, so I can't see its hours, photos or posts. Connect it and KOB will check it every morning and flag anything out of date.";

const dayTitle = (d: Day) => d[0] + d.slice(1).toLowerCase();
function hoursLine(periods: HoursPeriod[], day: Day) {
  const p = periods.filter((x) => x.day === day);
  return p.length ? p.map((x) => `${x.open}–${x.close}`).join(", ") : "closed";
}

function describeChange(ch: { field: string; before: unknown; after: unknown }): string {
  if (ch.field === "hours") {
    const before = ch.before as HoursPeriod[];
    const after = ch.after as HoursPeriod[];
    const days = DAYS.filter((d) => hoursLine(before, d) !== hoursLine(after, d));
    return days.map((d) => `${dayTitle(d)} hours ${hoursLine(before, d)} → ${hoursLine(after, d)}`).join("; ");
  }
  if (ch.field === "photos") return `${Number(ch.after) - Number(ch.before)} new photo(s)`;
  if (ch.field === "posts") return "a new post";
  if (ch.field === "description") return "the description changed";
  if (ch.field === "specialHours") return "holiday hours changed";
  if (ch.field === "categories") return "categories changed";
  return ch.field;
}

async function listingChanges(c: Ctx): Promise<FactAnswer> {
  const g = await googleConnection(c.restaurantId);
  if (g.state !== "connected") return { intent: "listing", text: NOT_CONNECTED, activity: [{ label: "Checked your Google connection", status: "complete" }] };
  const since = new Date(c.now.getTime() - 7 * 86_400_000);
  const [s, rows] = await Promise.all([
    reviewSummary(c.restaurantId, since, c.now),
    prisma.osFact.findMany({ where: { restaurantId: c.restaurantId, key: LISTING_FACT, lastUpdatedAt: { gte: since } }, orderBy: { lastUpdatedAt: "asc" } }),
  ]);
  const changes = rows.flatMap((r) => ((r.valueJson as { changes?: { field: string; before: unknown; after: unknown }[] }).changes ?? []).map(describeChange));
  const latest = rows.at(-1)?.valueJson as ListingSnapshot | undefined;
  const lines = [
    rows.length ? `Since last week on Google: ${changes.length ? changes.join("; ") : "no changes to hours, photos, posts or description"}.` : "KOB hasn't read your listing in the last week yet.",
    `${plural(s.count, "new review")} in the last 7 days.`,
    latest ? `Right now: ${latest.photoCount} photos, last post ${latest.lastPostAt ? formatLocalDate(latest.lastPostAt.slice(0, 10)) : "never"}.` : "",
  ];
  return { intent: "listing", text: lines.filter(Boolean).join(" "), activity: [{ label: "Checked your Google listing", status: "complete" }] };
}

async function hoursCompare(c: Ctx): Promise<FactAnswer> {
  const g = await googleConnection(c.restaurantId);
  if (g.state !== "connected") return { intent: "listing", text: NOT_CONNECTED, activity: [{ label: "Checked your Google connection", status: "complete" }] };
  const [snap, site] = await Promise.all([lastSnapshot(c.restaurantId), websiteHours(c.restaurantId)]);
  if (!snap) return { intent: "listing", text: "KOB hasn't read your Google hours yet. It will on the next morning check.", activity: [] };
  if (!site)
    return {
      intent: "listing",
      text: "Your website doesn't state its opening hours in a way KOB can read, so I can't compare them. Tell me your hours and I'll check Google against them.",
      activity: [{ label: "Checked your Google hours", status: "complete" }],
    };
  const days = DAYS.filter((d) => hoursLine(snap.hours, d) !== hoursLine(site, d));
  if (!days.length) return { intent: "listing", text: "Yes — your Google hours match your website for every day.", activity: [{ label: "Compared your hours", status: "complete" }] };
  const { approvals } = await pendingApprovals(c.restaurantId);
  const waiting = approvals.some((a) => a.kind === "gbp.hours.regular.update");
  return {
    intent: "listing",
    text: `No. ${days.map((d) => `${dayTitle(d)}: Google says ${hoursLine(snap.hours, d)}, your website says ${hoursLine(site, d)}`).join(". ")}. ${
      waiting ? "A fix is waiting in Needs you — approve it and KOB updates Google and checks it took." : "Tell me which is right and I'll prepare the change for you to approve."
    }`,
    activity: [{ label: "Compared your hours", status: "complete" }],
  };
}

/** "close at 22:00 on Sundays", "open at 11am on Mondays" → which days and which time changed. */
export function parseHoursStatement(text: string): { days: Day[]; open?: string; close?: string } | null {
  const t = text.toLowerCase();
  const days = DAYS.filter((d) => new RegExp(`\\b${d.toLowerCase()}s?\\b|\\b${d.slice(0, 3).toLowerCase()}\\b`).test(t));
  const clock = (raw: string) => {
    const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(raw.trim());
    if (!m) return undefined;
    let h = Number(m[1]);
    if (m[3] === "pm" && h < 12) h += 12;
    if (m[3] === "am" && h === 12) h = 0;
    return h <= 24 ? `${String(h).padStart(2, "0")}:${m[2] ?? "00"}` : undefined;
  };
  const close = /\bclos(?:e|es|ing)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/.exec(t)?.[1];
  const open = /\bopen(?:s|ing)?\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/.exec(t)?.[1];
  const out = { days, ...(open ? { open: clock(open) } : {}), ...(close ? { close: clock(close) } : {}) };
  return days.length && (out.open || out.close) ? out : null;
}

async function hoursChange(c: Ctx, message: string): Promise<FactAnswer> {
  const g = await googleConnection(c.restaurantId);
  const said = parseHoursStatement(message);
  if (g.state !== "connected")
    return {
      intent: "hours",
      text: "Got it. Connect your Google listing and KOB can update your hours there once you approve, then check they took. Until then, please change them in your Google Business Profile.",
      activity: [],
    };
  const snap = await lastSnapshot(c.restaurantId);
  if (!said || !snap)
    return {
      intent: "hours",
      text: snap
        ? "Which day and what time? For example: \"close at 22:00 on Sundays\"."
        : "KOB hasn't read your Google hours yet, so I can't prepare the change safely. It will after the next morning check.",
      activity: [],
    };
  const next: HoursPeriod[] = snap.hours.map((p) =>
    said.days.includes(p.day) ? { ...p, ...(said.open ? { open: said.open } : {}), ...(said.close ? { close: said.close } : {}) } : p,
  );
  const missing = said.days.filter((d) => !snap.hours.some((p) => p.day === d));
  if (missing.length && said.open && said.close) for (const d of missing) next.push({ day: d, open: said.open, close: said.close });
  if (sameHours(next, snap.hours)) return { intent: "hours", text: "Google already shows those hours — nothing to change.", activity: [{ label: "Checked your Google hours", status: "complete" }] };
  await saveWebsiteHours(c.restaurantId, next, c.now, "owner");
  const changed = DAYS.filter((d) => hoursLine(snap.hours, d) !== hoursLine(next, d));
  const summary = changed.map((d) => `${dayTitle(d)} ${hoursLine(snap.hours, d)} → ${hoursLine(next, d)}`).join("; ");
  const { action } = await proposeHoursUpdate(c.restaurantId, snap.location, snap.hours, next, {
    reason: `Owner said: ${message.slice(0, 200)}`,
    requestedByUserId: c.userId,
    channelOrigin: "WEB",
    now: c.now,
  });
  return {
    intent: "hours",
    text:
      action.status === "AWAITING_APPROVAL"
        ? `Ready to update Google: ${summary}. It's waiting in Needs you — approve it and KOB changes your listing, then checks Google shows the new hours.`
        : `I noted ${summary}, but couldn't line up the Google change (${action.failureReason ?? "Google isn't ready"}). Please update it in your Google Business Profile for now.`,
    activity: [{ label: "Prepared a Google hours change", status: "complete" }],
  };
}

async function trial(c: Ctx, wantsCancel: boolean): Promise<FactAnswer> {
  const p = await planStatus(c.restaurantId, c.now);
  const ends = p.trialEndsAt ? formatLocalDate(p.trialEndsAt.slice(0, 10)) : null;
  const status = p.trialEndsAt
    ? p.trialDaysLeft
      ? `Your free trial ends ${ends} (${plural(p.trialDaysLeft, "day")} left).`
      : `Your free trial ended ${ends}.`
    : p.plan === "FREE"
      ? "You're not on a trial or a paid plan right now."
      : `You're on the ${p.plan.toLowerCase()} plan.`;
  const cancel = wantsCancel
    ? p.hasSubscription
      ? " You can cancel any time from Billing; nothing is charged if you cancel before the trial ends."
      : " There's no card on file, so nothing will be charged — if you don't add one, KOB simply pauses when the trial ends."
    : "";
  return {
    intent: "trial",
    text: `${status} After the trial it's ${p.price.label} per location.${cancel}`,
    activity: [{ label: "Checked your plan", status: "complete" }],
  };
}

async function priceAfterTrial(c: Ctx): Promise<FactAnswer> {
  const p = await planStatus(c.restaurantId, c.now);
  const local =
    p.localCurrency !== p.price.currency
      ? ` Billing in ${p.localCurrency} isn't available yet, so it's charged in ${p.price.currency}; your bank converts it at its own rate.`
      : "";
  return {
    intent: "price",
    text: `After the trial it's ${money(p.price.amount, p.price.currency)} a month per location.${local} No contract.`,
    activity: [{ label: "Checked your plan", status: "complete" }],
  };
}

async function profile(c: Ctx): Promise<FactAnswer> {
  const p = c.profile;
  const bits = [
    `${p.name}${p.cuisine ? `, a ${p.cuisine.toLowerCase()}` : ""}${p.city ? ` in ${p.city}` : ""}.`,
    p.pricePoint ? `Price point: ${p.pricePoint} a head.` : "I don't have your price point yet — tell me your average spend per head.",
    p.audience ? `Who you're for: ${p.audience}.` : "",
  ];
  return { intent: "profile", text: bits.filter(Boolean).join(" "), activity: [] };
}

async function waiting(c: Ctx, wantsApproveAll: boolean): Promise<FactAnswer> {
  const { approvals, tasks } = await pendingApprovals(c.restaurantId);
  if (!approvals.length && !tasks.length)
    return { intent: "approvals", text: "Nothing is waiting for you right now.", activity: [{ label: "Checked Needs you", status: "complete" }] };
  const list = [...approvals.map((a) => `• ${a.title}`), ...tasks.map((t) => `• ${t.title}`)].slice(0, 10).join("\n");
  return {
    intent: "approvals",
    text: `Waiting for you:\n${list}\n\n${
      wantsApproveAll
        ? "I won't approve these in bulk from a message. Open Needs you, check each one, and tap approve — nothing goes out until you do."
        : "Open Needs you to approve or change them."
    }`,
    activity: [{ label: "Checked Needs you", status: "complete" }],
  };
}

async function postReplyNow(c: Ctx): Promise<FactAnswer> {
  const { approvals } = await pendingApprovals(c.restaurantId);
  const replies = approvals.filter((a) => a.kind === "gbp.review.reply");
  return {
    intent: "post_reply",
    text: replies.length
      ? `${plural(replies.length, "reply", "replies")} ${replies.length === 1 ? "is" : "are"} waiting: ${replies.map((r) => r.title).join("; ")}. Approve the one you want in Needs you and KOB posts it to Google, then checks it's showing.`
      : "There's no reply waiting to post. Ask me to reply to a review first; you'll approve the exact wording before it goes to Google.",
    activity: [{ label: "Checked Needs you", status: "complete" }],
  };
}

async function morningBrief(c: Ctx): Promise<FactAnswer> {
  const brief = await latestBrief(c.restaurantId);
  return {
    intent: "brief",
    text: `${brief ? `Your latest brief (${brief.date}): ${brief.headline ?? brief.greeting}.` : "There's no brief yet today."} Brief emails aren't switched on yet, so I can't send it by email from here — it's on your Today page.`,
    activity: [],
  };
}

async function quietBooks(c: Ctx): Promise<FactAnswer> {
  const since = new Date(c.now.getTime());
  const until = new Date(c.now.getTime() + 7 * 86_400_000);
  const bookings = await prisma.booking.count({ where: { restaurantId: c.restaurantId, startsAt: { gte: since, lt: until } } }).catch(() => 0);
  return {
    intent: "quiet_books",
    text: bookings
      ? `${plural(bookings, "booking")} in the next 7 days in what KOB can see. Tell me which nights feel quiet and I'll suggest something for them.`
      : "I can't see your bookings — no booking system is connected. Tell me which nights are usually quiet and I'll remember it and suggest offers for them.",
    activity: [{ label: "Checked your bookings", status: "complete" }],
  };
}

async function reviewAsk(c: Ctx): Promise<FactAnswer> {
  const link = await googleReviewLink(c.restaurantId);
  if (!link)
    return {
      intent: "review_ask",
      text: "I don't have last night's guest list, so I won't guess who to message. Connect your Google listing and I'll give you your review link, a QR code for the tables and a short thank-you message to send.",
      activity: [],
    };
  const msg = reviewAskMessage(c.profile.name, link.url, "sms");
  return {
    intent: "review_ask",
    text: `I don't have last night's guest list, so I won't guess who to message. Here's a thank-you you can send to guests who've said you can contact them:\n\n"${msg.body}"\n\nFor the tables, print the review card with a QR code from Reviews → Review card. Never offer anything in return for a review.`,
    activity: [{ label: "Found your Google review link", status: "complete" }],
  };
}

async function help(c: Ctx): Promise<FactAnswer> {
  const rules = await houseRules(c.restaurantId);
  return {
    intent: "help",
    text: `I can help with your reviews (counts, what needs a reply, drafting replies for you to approve), your Google listing, offers for quiet nights, posts, your house rules${rules.length ? ` (you have ${rules.length})` : ""}, and your plan. What would you like to do?`,
    activity: [],
  };
}

/** Route one owner message to the matching fact-based answer. */
export async function answerFromFacts(
  restaurantId: string,
  userId: string | null,
  message: string,
  opts: { now?: Date; generate?: Generate } = {},
): Promise<FactAnswer> {
  const now = opts.now ?? new Date();
  const c: Ctx = { restaurantId, userId, now, profile: await loadProfile(restaurantId), generate: opts.generate };
  const t = message.toLowerCase();
  const day = Object.keys(WEEKDAY).find((d) => t.includes(d));

  if (/\b(house rule|learn this|remember this)\b/.test(t) || (/^\s*(never|always|don'?t|do not)\b/.test(t) && !/\?$/.test(t.trim())))
    return saveRule(c, message);
  if (/\bapprove (everything|all)\b/.test(t)) return waiting(c, true);
  if (/\bpost (the|that|this) reply\b/.test(t)) return postReplyNow(c);
  if (/\b(reply|respond)\b/.test(t) || /\bdraft a reply\b/.test(t)) return replyToReview(c, message);
  if (/\b(nudge|ask|get)\b.*\breview/.test(t)) return reviewAsk(c);
  if (/\bhow many reviews\b/.test(t)) return reviewCount(c, /last month/.test(t) ? "last_month" : /week/.test(t) ? "week" : "month");
  if (/\breviews?\b/.test(t)) return reviewsThisWeek(c);
  if (/mother'?s day|mothering sunday/.test(t)) return mothersDayOffer(c);
  if (day && /\b(busy|packed|full|rammed)\b/.test(t) && !/\?$/.test(t.trim())) return busyNight(c, day);
  if (day && /\b(dead|quiet|slow|empty|help)\b/.test(t)) return quietNight(c, day);
  if (/\b(quiet|on the books|bookings?)\b/.test(t)) return quietBooks(c);
  if (/\b(instagram|post|caption)\b/.test(t)) return socialPost(c, message);
  if (/\bhours\b/.test(t) && /\b(same|match|website|differ)\b/.test(t)) return hoursCompare(c);
  if (/\bhours\b|\bclose at\b|\bopen(ing)? at\b/.test(t)) return hoursChange(c, message);
  if (/\b(google|listing)\b/.test(t)) return listingChanges(c);
  if (/\b(rand|zar|how much|price after|cost after|pay after)\b/.test(t)) return priceAfterTrial(c);
  if (/\b(cancel|trial)\b/.test(t)) return trial(c, /\bcancel\b/.test(t));
  if (/\b(price point|who are we|our customers|who we're for)\b/.test(t)) return profile(c);
  if (/\bbrief\b/.test(t)) return morningBrief(c);
  if (/\b(waiting|needs me|to approve|approvals?)\b/.test(t)) return waiting(c, false);
  return help(c);
}
