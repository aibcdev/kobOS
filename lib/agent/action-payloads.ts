import { z } from "zod";
import type { ActionType } from "@/lib/agent/action-types";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
const day = z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);

/** Spec 1 §7.5. `propose_action` payloads are validated here before a row is written. */
export const ActionPayload = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("gbp.review.reply"),
    reviewId: z.string(),
    replyText: z.string().min(2).max(1500),
    replyId: z.string().optional(),
  }),
  z.object({ actionType: z.literal("gbp.review.reply.update"), reviewId: z.string(), replyText: z.string().min(2).max(1500) }),
  z.object({ actionType: z.literal("gbp.review.reply.delete"), reviewId: z.string() }),
  z.object({
    actionType: z.literal("gbp.hours.regular.update"),
    gbpLocationId: z.string(),
    periods: z.array(z.object({ day, open: hhmm, close: hhmm })).max(28),
  }),
  z.object({
    actionType: z.literal("gbp.hours.special.set"),
    gbpLocationId: z.string(),
    days: z
      .array(z.object({ date: z.iso.date(), closed: z.boolean(), open: z.string().optional(), close: z.string().optional() }))
      .min(1)
      .max(30),
  }),
  z.object({
    actionType: z.literal("gbp.attribute.chat.set"),
    gbpLocationId: z.string(),
    kind: z.enum(["WHATSAPP", "SMS"]),
    uri: z.url(),
  }),
  z.object({
    actionType: z.literal("gbp.post.create"),
    gbpLocationId: z.string(),
    summary: z.string().max(1500),
    topicType: z.enum(["STANDARD", "OFFER", "EVENT"]),
    assetId: z.string().optional(),
    cta: z.object({ type: z.enum(["ORDER", "BOOK", "LEARN_MORE", "CALL"]), url: z.url().optional() }).optional(),
    event: z.object({ title: z.string(), start: z.string(), end: z.string() }).optional(),
  }),
  z.object({ actionType: z.literal("gbp.profile.description.update"), gbpLocationId: z.string(), description: z.string().max(750) }),
  z.object({ actionType: z.literal("ig.post.publish"), socialPostId: z.string() }),
  z.object({ actionType: z.literal("fb.post.publish"), socialPostId: z.string() }),
  z.object({
    actionType: z.literal("email.send.supplier"),
    to: z.email(),
    subject: z.string().max(140),
    body: z.string().max(4000),
    invoiceId: z.string().optional(),
  }),
  z.object({ actionType: z.literal("guest.reply.send"), guestThreadId: z.string(), body: z.string().max(1000), intent: z.string() }),
  z.object({ actionType: z.literal("pos.item.86"), provider: z.enum(["SQUARE", "TOAST"]), itemId: z.string(), soldOut: z.boolean() }),
  z.object({
    actionType: z.literal("pos.item.price.update"),
    provider: z.enum(["SQUARE", "TOAST"]),
    itemVariationId: z.string(),
    newPriceMinor: z.number().int().positive(),
  }),
  z.object({
    actionType: z.literal("calendar.event.create"),
    title: z.string(),
    start: z.string(),
    end: z.string(),
    description: z.string().optional(),
  }),
]);

export type ActionPayload = z.infer<typeof ActionPayload>;
export type PayloadFor<T extends ActionType> = Extract<ActionPayload, { actionType: T }>;

/** The external object an action changes; part of the idempotency key. */
export function actionTarget(p: ActionPayload): string {
  switch (p.actionType) {
    case "gbp.review.reply":
    case "gbp.review.reply.update":
    case "gbp.review.reply.delete":
      return `review:${p.reviewId}`;
    case "gbp.hours.regular.update":
    case "gbp.hours.special.set":
    case "gbp.attribute.chat.set":
    case "gbp.post.create":
    case "gbp.profile.description.update":
      return `gbp:${p.gbpLocationId}`;
    case "ig.post.publish":
    case "fb.post.publish":
      return `social:${p.socialPostId}`;
    case "email.send.supplier":
      return `email:${p.to.toLowerCase()}`;
    case "guest.reply.send":
      return `thread:${p.guestThreadId}`;
    case "pos.item.86":
      return `pos:${p.provider}:${p.itemId}`;
    case "pos.item.price.update":
      return `pos:${p.provider}:${p.itemVariationId}`;
    case "calendar.event.create":
      return `calendar:${p.start}`;
  }
}
