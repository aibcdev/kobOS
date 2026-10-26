import type { OsAction } from "@prisma/client";
import { actionView, type ActionView } from "@/lib/agent/access";
import type { ActionPayload } from "@/lib/agent/action-payloads";
import { EDITABLE_FIELD } from "@/lib/agent/ledger";
import { isAssisted, publishMode, type PublishMode } from "@/lib/agent/publish-mode";
import { prisma } from "@/lib/db/prisma";

/**
 * What the owner needs to post an approved change on Google by hand: the exact words to copy, what it answers,
 * and where on Google to paste it. Only for Google actions in assisted mode (or targets Google can't be written to).
 */
export type Assist = {
  /** What this answers or changes, for context (the review, or "Sunday 12:00–21:00 → 12:00–22:00"). */
  context: string | null;
  /** Exactly what to paste into Google. */
  copyText: string;
  /** Payload field the owner may edit before approving; null when it isn't free text. */
  editableField: "replyText" | "description" | "summary" | null;
  googleUrl: string;
  googleLabel: string;
  /** "I've posted it" / "I've updated it". */
  doneLabel: string;
  kind: "review_reply" | "hours" | "special_hours" | "description" | "post";
};

/** Google's review inbox for the signed-in owner, and the profile page for edits. */
export const GOOGLE_REVIEWS_URL = "https://business.google.com/reviews";
export const GOOGLE_PROFILE_URL = "https://business.google.com/locations";

const title = (d: string) => d[0] + d.slice(1).toLowerCase();
type Period = { day: string; open: string; close: string };
function hoursLines(periods: Period[]): string[] {
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  return days.map((d) => {
    const p = periods.filter((x) => x.day === d);
    return `${title(d)}: ${p.length ? p.map((x) => `${x.open}–${x.close}`).join(", ") : "Closed"}`;
  });
}

async function reviewFor(action: OsAction, reviewId: string) {
  const local = /^kob-review:(.+)$/.exec(reviewId)?.[1];
  return prisma.customerReview.findFirst({
    where: local ? { id: local, restaurantId: action.restaurantId } : { restaurantId: action.restaurantId, externalReviewId: reviewId },
    select: { rating: true, reviewerName: true, body: true, sourceUrl: true },
  });
}

export async function assistFor(action: OsAction, mode: PublishMode): Promise<Assist | null> {
  if (!isAssisted(action, mode)) return null;
  const p = action.proposedPayload as ActionPayload;
  const editableField = EDITABLE_FIELD[action.actionType] ?? null;
  switch (p.actionType) {
    case "gbp.review.reply": {
      const r = await reviewFor(action, p.reviewId);
      const who = r?.reviewerName?.trim().split(/\s+/)[0];
      return {
        kind: "review_reply",
        context: r ? `${"★".repeat(Math.max(0, Math.min(5, r.rating)))}${who ? ` ${who}` : ""}: ${r.body.trim().slice(0, 400) || "(rating only)"}` : null,
        copyText: p.replyText,
        editableField,
        googleUrl: r?.sourceUrl || GOOGLE_REVIEWS_URL,
        googleLabel: "Open on Google",
        doneLabel: "I've posted it",
      };
    }
    case "gbp.hours.regular.update": {
      const before = (action.rollbackPayload as { periods?: Period[] } | null)?.periods ?? null;
      const after = hoursLines(p.periods as Period[]);
      const changed = before ? hoursLines(before).map((line, i) => (line !== after[i] ? `${line.split(":")[0]}: ${line.slice(line.indexOf(":") + 2)} → ${after[i].slice(after[i].indexOf(":") + 2)}` : null)).filter(Boolean) : [];
      return {
        kind: "hours",
        context: changed.length ? changed.join(" · ") : null,
        copyText: after.join("\n"),
        editableField: null,
        googleUrl: GOOGLE_PROFILE_URL,
        googleLabel: "Open Google Business Profile",
        doneLabel: "I've updated it",
      };
    }
    case "gbp.hours.special.set":
      return {
        kind: "special_hours",
        context: null,
        copyText: p.days.map((d) => `${d.date}: ${d.closed ? "Closed" : `${d.open}–${d.close}`}`).join("\n"),
        editableField: null,
        googleUrl: GOOGLE_PROFILE_URL,
        googleLabel: "Open Google Business Profile",
        doneLabel: "I've updated it",
      };
    case "gbp.profile.description.update":
      return { kind: "description", context: null, copyText: p.description, editableField, googleUrl: GOOGLE_PROFILE_URL, googleLabel: "Open Google Business Profile", doneLabel: "I've updated it" };
    case "gbp.post.create":
      return { kind: "post", context: null, copyText: p.summary, editableField, googleUrl: GOOGLE_PROFILE_URL, googleLabel: "Open Google Business Profile", doneLabel: "I've posted it" };
    default:
      return null;
  }
}

/** The view the owner's screens use: the action plus, in assisted mode, how to post it by hand. */
export async function viewWithAssist(action: OsAction, mode?: PublishMode): Promise<ActionView> {
  return { ...actionView(action), assist: await assistFor(action, mode ?? (await publishMode(action.restaurantId))) };
}

export async function viewsWithAssist(actions: OsAction[]): Promise<ActionView[]> {
  const modes = new Map<string, PublishMode>();
  for (const id of new Set(actions.map((a) => a.restaurantId))) modes.set(id, await publishMode(id));
  return Promise.all(actions.map((a) => viewWithAssist(a, modes.get(a.restaurantId))));
}
