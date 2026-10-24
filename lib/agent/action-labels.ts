import type { ActionType } from "@/lib/agent/action-types";

/** Owner-facing names for action types, used in settings and grant lists. */
export const ACTION_LABELS: Record<ActionType, string> = {
  "gbp.review.reply": "Reply to Google reviews",
  "gbp.review.reply.update": "Edit Google review replies",
  "gbp.review.reply.delete": "Delete Google review replies",
  "gbp.hours.regular.update": "Change opening hours on Google",
  "gbp.hours.special.set": "Set holiday hours on Google",
  "gbp.attribute.chat.set": "Turn Google chat on or off",
  "gbp.post.create": "Post updates on Google",
  "gbp.profile.description.update": "Edit your Google description",
  "ig.post.publish": "Post on Instagram",
  "fb.post.publish": "Post on Facebook",
  "email.send.supplier": "Email suppliers",
  "guest.reply.send": "Reply to guests",
  "pos.item.86": "Mark items sold out",
  "pos.item.price.update": "Change menu prices",
  "calendar.event.create": "Add calendar events",
};

export function actionLabel(actionType: string): string {
  return (ACTION_LABELS as Record<string, string>)[actionType] ?? actionType;
}
