import type { OsAction } from "@prisma/client";
import type { ActionPayload } from "@/lib/agent/action-payloads";
import type { ActionAdapter } from "@/lib/agent/verify";
import { ConnectorError } from "@/lib/connectors/errors";
import { gbpClient, parseReviewName, type Fetch, type GbpReview } from "@/lib/connectors/gbp/client";
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

/** The restaurant's GBP client, refusing reviews that aren't on the location the owner picked. */
async function clientFor(action: OsAction, reviewName: string, f?: Fetch) {
  const integration = await prisma.integration.findUnique({ where: { restaurantId_provider: { restaurantId: action.restaurantId, provider: "GBP" } } });
  if (!integration || integration.status === "DISCONNECTED") throw new ConnectorError("AUTH", "Google Business Profile isn't connected");
  const location = locationIdsOf(integration.metadata)?.[0];
  if (!location || !reviewName.startsWith(`${location}/reviews/`)) throw new ConnectorError("VALIDATION", "That review isn't on this restaurant's Google listing");
  return gbpClient(await getAccessToken(integration.id, { fetch: f }), f);
}

/**
 * Spec 1 §7.8 for `gbp.review.reply`: precheck (already says this?) → execute (PUT …/reply, the only write) →
 * verify (GET the review and compare reviewReply.comment).
 */
export function createGbpAdapter(opts: { fetch?: Fetch } = {}): ActionAdapter {
  const read = async (action: OsAction): Promise<{ review: GbpReview; reviewName: string; replyText: string }> => {
    const { reviewName, replyText } = replyPayload(action);
    const review = await (await clientFor(action, reviewName, opts.fetch)).review(reviewName);
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
      if (!(await flag("GBP_LIVE", action.restaurantId))) throw new ConnectorError("VALIDATION", "GBP_LIVE is off for this restaurant");
      const { reviewName, replyText } = replyPayload(action);
      const res = await (await clientFor(action, reviewName, opts.fetch)).reply(reviewName, replyText);
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
