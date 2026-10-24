import type { OsAction } from "@prisma/client";
import type { ActionPayload } from "@/lib/agent/action-payloads";
import type { ActionAdapter } from "@/lib/agent/verify";
import { ConnectorError } from "@/lib/connectors/errors";
import { gbpClient, parseLocationName, parseReviewName, type Fetch, type GbpClient, type GbpReview } from "@/lib/connectors/gbp/client";
import { hoursFromGoogle, hoursToGoogle, sameHours, specialFromGoogle, specialToGoogle, type HoursPeriod, type SpecialDay } from "@/lib/connectors/gbp/listing";
import { recordPostedReply } from "@/lib/connectors/gbp/reviews";
import { prisma } from "@/lib/db/prisma";
import { flag } from "@/lib/flags";
import { locationIdsOf } from "@/lib/hub/locations";
import { getAccessToken } from "@/lib/hub/tokens";

const same = (a: string | undefined, b: string) => (a ?? "").trim() === b.trim();

function replyPayload(action: OsAction): { reviewName: string; replyText: string } {
  const p = action.proposedPayload as ActionPayload;
  if (p.actionType !== "gbp.review.reply") throw new ConnectorError("VALIDATION", `GBP adapter can't run ${p.actionType}`);
  if (!parseReviewName(p.reviewId)) throw new ConnectorError("VALIDATION", "Not a Google review");
  return { reviewName: p.reviewId, replyText: p.replyText };
}

/** The restaurant's GBP client, refusing targets that aren't on the location the owner picked. */
async function clientFor(action: OsAction, target: string, f?: Fetch): Promise<GbpClient> {
  const integration = await prisma.integration.findUnique({ where: { restaurantId_provider: { restaurantId: action.restaurantId, provider: "GBP" } } });
  if (!integration || integration.status === "DISCONNECTED") throw new ConnectorError("AUTH", "Google Business Profile isn't connected");
  const location = locationIdsOf(integration.metadata)?.[0];
  if (!location || (target !== location && !target.startsWith(`${location}/`)))
    throw new ConnectorError("VALIDATION", "That isn't on this restaurant's Google listing");
  return gbpClient(await getAccessToken(integration.id, { fetch: f }), f);
}

async function requireLive(action: OsAction) {
  if (!(await flag("GBP_LIVE", action.restaurantId))) throw new ConnectorError("VALIDATION", "GBP_LIVE is off for this restaurant");
}

type Part = Pick<ActionAdapter, "precheck" | "execute" | "verify">;

function reviewReply(f?: Fetch): Part {
  const read = async (action: OsAction): Promise<{ review: GbpReview; reviewName: string; replyText: string }> => {
    const { reviewName, replyText } = replyPayload(action);
    const review = await (await clientFor(action, reviewName, f)).review(reviewName);
    return { review, reviewName, replyText };
  };
  return {
    async precheck(action) {
      const { review, reviewName, replyText } = await read(action);
      const done = same(review.reviewReply?.comment, replyText);
      if (done) await recordPostedReply(action.restaurantId, reviewName, replyText, new Date(review.reviewReply!.updateTime));
      return { alreadySatisfied: done, evidence: { reviewName, reply: review.reviewReply?.comment ?? null } };
    },
    async execute(action) {
      await requireLive(action);
      const { reviewName, replyText } = replyPayload(action);
      const res = await (await clientFor(action, reviewName, f)).reply(reviewName, replyText);
      return { reviewName, comment: res.comment, updateTime: res.updateTime };
    },
    async verify(action) {
      const { review, reviewName, replyText } = await read(action);
      const reply = review.reviewReply;
      // Google sometimes holds a reply for moderation before it shows; keep checking rather than failing.
      if (!reply) return { verified: false, pendingProvider: true };
      if (!same(reply.comment, replyText)) return { verified: false, evidence: { reviewName, reply: reply.comment } };
      await recordPostedReply(action.restaurantId, reviewName, replyText, new Date(reply.updateTime));
      return { verified: true, evidence: { reviewName, reply: reply.comment, updateTime: reply.updateTime } };
    },
  };
}

function payloadOf<T extends ActionPayload["actionType"]>(action: OsAction, type: T): Extract<ActionPayload, { actionType: T }> {
  const p = action.proposedPayload as ActionPayload;
  if (p.actionType !== type) throw new ConnectorError("VALIDATION", `Expected ${type}, got ${p.actionType}`);
  const location = (p as { gbpLocationId?: unknown }).gbpLocationId;
  if (typeof location !== "string" || !parseLocationName(location)) throw new ConnectorError("VALIDATION", "Not a Google location");
  return p as Extract<ActionPayload, { actionType: T }>;
}

/** Regular hours: PATCH regularHours, then read them back. */
function regularHours(f?: Fetch): Part {
  const want = (action: OsAction) => {
    const p = payloadOf(action, "gbp.hours.regular.update");
    return { location: p.gbpLocationId, periods: p.periods as HoursPeriod[] };
  };
  const current = async (action: OsAction) => {
    const { location } = want(action);
    return hoursFromGoogle((await (await clientFor(action, location, f)).listing(location)).regularHours?.periods);
  };
  return {
    async precheck(action) {
      const now = await current(action);
      return { alreadySatisfied: sameHours(now, want(action).periods), evidence: { hours: now } };
    },
    async execute(action) {
      await requireLive(action);
      const { location, periods } = want(action);
      const res = await (await clientFor(action, location, f)).updateListing(location, { regularHours: { periods: hoursToGoogle(periods) } }, "regularHours");
      return { location, hours: hoursFromGoogle(res.regularHours?.periods) };
    },
    async verify(action) {
      const now = await current(action);
      return { verified: sameHours(now, want(action).periods), evidence: { hours: now } };
    },
  };
}

/** Special hours for given dates: merged with the dates already set, so other holidays are left alone. */
function specialHours(f?: Fetch): Part {
  const want = (action: OsAction) => {
    const p = payloadOf(action, "gbp.hours.special.set");
    return { location: p.gbpLocationId, days: p.days as SpecialDay[] };
  };
  const current = async (action: OsAction) => {
    const { location } = want(action);
    return specialFromGoogle((await (await clientFor(action, location, f)).listing(location)).specialHours?.specialHourPeriods);
  };
  const covers = (have: SpecialDay[], days: SpecialDay[]) => days.every((d) => have.some((h) => JSON.stringify(h) === JSON.stringify(d)));
  return {
    async precheck(action) {
      const have = await current(action);
      return { alreadySatisfied: covers(have, want(action).days), evidence: { specialHours: have } };
    },
    async execute(action) {
      await requireLive(action);
      const { location, days } = want(action);
      const kept = (await current(action)).filter((h) => !days.some((d) => d.date === h.date));
      const merged = [...kept, ...days].sort((a, b) => a.date.localeCompare(b.date));
      await (await clientFor(action, location, f)).updateListing(location, { specialHours: { specialHourPeriods: specialToGoogle(merged) } }, "specialHours");
      return { location, days };
    },
    async verify(action) {
      const have = await current(action);
      return { verified: covers(have, want(action).days), evidence: { specialHours: have } };
    },
  };
}

function description(f?: Fetch): Part {
  const want = (action: OsAction) => {
    const p = payloadOf(action, "gbp.profile.description.update");
    return { location: p.gbpLocationId, text: p.description };
  };
  const current = async (action: OsAction) => {
    const { location } = want(action);
    return (await (await clientFor(action, location, f)).listing(location)).profile?.description ?? "";
  };
  return {
    async precheck(action) {
      const have = await current(action);
      return { alreadySatisfied: same(have, want(action).text), evidence: { description: have } };
    },
    async execute(action) {
      await requireLive(action);
      const { location, text } = want(action);
      await (await clientFor(action, location, f)).updateListing(location, { profile: { description: text } }, "profile.description");
      return { location };
    },
    async verify(action) {
      const have = await current(action);
      return { verified: same(have, want(action).text), evidence: { description: have } };
    },
  };
}

/** A post: created once (a retry finds the earlier one by its text), done when Google shows it LIVE. */
function localPost(f?: Fetch): Part {
  const want = (action: OsAction) => payloadOf(action, "gbp.post.create");
  const find = async (action: OsAction) => {
    const p = want(action);
    const since = action.createdAt.toISOString();
    const posts = await (await clientFor(action, p.gbpLocationId, f)).localPosts(p.gbpLocationId);
    return posts.find((x) => same(x.summary, p.summary) && (x.createTime ?? since) >= since) ?? null;
  };
  return {
    async precheck(action) {
      const existing = await find(action);
      return { alreadySatisfied: existing?.state === "LIVE", evidence: { post: existing?.name ?? null } };
    },
    async execute(action) {
      await requireLive(action);
      const p = want(action);
      const existing = await find(action);
      if (existing) return { post: existing.name };
      const body: Record<string, unknown> = { languageCode: "en", summary: p.summary, topicType: p.topicType };
      if (p.cta) body.callToAction = { actionType: p.cta.type, ...(p.cta.url ? { url: p.cta.url } : {}) };
      if (p.event) body.event = { title: p.event.title, schedule: { startDate: dateOf(p.event.start), endDate: dateOf(p.event.end) } };
      const created = await (await clientFor(action, p.gbpLocationId, f)).createLocalPost(p.gbpLocationId, body);
      return { post: created.name };
    },
    async verify(action, executed) {
      const p = want(action);
      const name = typeof executed?.post === "string" ? executed.post : (await find(action))?.name;
      if (!name) return { verified: false, pendingProvider: true };
      const post = await (await clientFor(action, p.gbpLocationId, f)).localPost(name);
      if (post.state === "LIVE") return { verified: true, evidence: { post: name, state: post.state } };
      if (post.state === "REJECTED") return { verified: false, evidence: { post: name, state: post.state } };
      return { verified: false, pendingProvider: true, evidence: { post: name, state: post.state ?? null } };
    },
  };
}

function dateOf(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

/**
 * Spec 1 §7.8 for GBP: precheck (already like this?) → execute (the only write) → verify (read it back from Google).
 * Review replies, regular and special hours, the description, and posts.
 */
export function createGbpAdapter(opts: { fetch?: Fetch } = {}): ActionAdapter {
  const parts: Record<string, Part> = {
    "gbp.review.reply": reviewReply(opts.fetch),
    "gbp.hours.regular.update": regularHours(opts.fetch),
    "gbp.hours.special.set": specialHours(opts.fetch),
    "gbp.profile.description.update": description(opts.fetch),
    "gbp.post.create": localPost(opts.fetch),
  };
  const partFor = (action: OsAction): Part => {
    const part = parts[action.actionType];
    if (!part) throw new ConnectorError("VALIDATION", `GBP adapter can't run ${action.actionType}`);
    return part;
  };
  return {
    precheck: (action) => partFor(action).precheck(action),
    execute: (action) => partFor(action).execute(action),
    verify: (action, executed) => partFor(action).verify(action, executed),
  };
}
