import type { ActionType } from "@/lib/agent/action-types";

/**
 * Spec 2 Phase 9. How long each task KOB does would take an owner by hand, so "time saved" is a stated estimate,
 * never a measured or invented figure. Changing a value bumps the version; past weeks keep the version they used.
 */
export const STANDARD_MINUTES_VERSION = "2026-10";

export const STANDARD_MINUTES: Record<ActionType, { minutes: number; basis: string }> = {
  "gbp.review.reply": { minutes: 4, basis: "Read the review, write a reply, post it on Google" },
  "gbp.review.reply.update": { minutes: 3, basis: "Rewrite and repost an existing reply" },
  "gbp.review.reply.delete": { minutes: 1, basis: "Find and remove a reply" },
  "gbp.hours.regular.update": { minutes: 5, basis: "Sign in to Google Business Profile and change opening hours" },
  "gbp.hours.special.set": { minutes: 5, basis: "Set holiday or special hours on Google" },
  "gbp.attribute.chat.set": { minutes: 2, basis: "Change a Google profile setting" },
  "gbp.post.create": { minutes: 15, basis: "Write a Google post, pick a photo, publish" },
  "gbp.profile.description.update": { minutes: 10, basis: "Rewrite the business description on Google" },
  "ig.post.publish": { minutes: 20, basis: "Write a caption, prepare the image, publish on Instagram" },
  "fb.post.publish": { minutes: 15, basis: "Write and publish a Facebook post" },
  "email.send.supplier": { minutes: 5, basis: "Write and send a supplier email" },
  "guest.reply.send": { minutes: 3, basis: "Read a guest message and reply" },
  "pos.item.86": { minutes: 2, basis: "Mark an item sold out on the till" },
  "pos.item.price.update": { minutes: 3, basis: "Change an item's price on the till" },
  "calendar.event.create": { minutes: 3, basis: "Add an event to the calendar" },
};

export function standardMinutes(actionType: string): number | null {
  return (STANDARD_MINUTES as Record<string, { minutes: number } | undefined>)[actionType]?.minutes ?? null;
}
