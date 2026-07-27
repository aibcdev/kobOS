/**
 * Mark a queued IG or FB message as sent (hybrid human send).
 *
 *   OUTBOUND_SEQUENCE_MARK_IG=<sequenceId> npm run outbound:sequence-mark
 *   OUTBOUND_SEQUENCE_MARK_FB=<sequenceId> npm run outbound:sequence-mark
 *   OUTBOUND_SEQUENCE_REPLIED=<sequenceId> OUTBOUND_SEQUENCE_REPLY_CHANNEL=instagram npm run outbound:sequence-mark
 */
import { prisma } from "../lib/db/prisma";
import {
  markFacebookMsgSent,
  markInstagramDmSent,
  markSequenceReplied,
} from "../lib/outbound/run-outbound-sequence";

async function main() {
  const ig = process.env.OUTBOUND_SEQUENCE_MARK_IG?.trim();
  const fb = process.env.OUTBOUND_SEQUENCE_MARK_FB?.trim();
  const replied = process.env.OUTBOUND_SEQUENCE_REPLIED?.trim();
  const channel = (process.env.OUTBOUND_SEQUENCE_REPLY_CHANNEL?.trim() || "email") as
    | "email"
    | "instagram"
    | "facebook";

  if (replied) {
    await markSequenceReplied(replied, channel);
    console.log({ replied, channel });
    return;
  }
  if (ig) {
    await markInstagramDmSent(ig);
    console.log({ markedInstagramSent: ig });
    return;
  }
  if (fb) {
    await markFacebookMsgSent(fb);
    console.log({ markedFacebookSent: fb });
    return;
  }
  throw new Error("Set OUTBOUND_SEQUENCE_MARK_IG, OUTBOUND_SEQUENCE_MARK_FB, or OUTBOUND_SEQUENCE_REPLIED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
