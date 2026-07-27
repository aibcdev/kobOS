/**
 * Backfill OutboundSequence for SENT leads + advance queue (IG/FB).
 * Export hybrid DM queue for human/VA send.
 *
 *   npm run outbound:sequence-sync
 *   OUTBOUND_SEQUENCE_ADVANCE=1 npm run outbound:sequence-sync
 */
import { OutboundChannelStatus, OutboundSequenceStatus } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { prisma } from "../lib/db/prisma";
import {
  advanceOutboundSequences,
  backfillSequencesForSentLeads,
} from "../lib/outbound/run-outbound-sequence";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const backfill = await backfillSequencesForSentLeads(wid);
  console.log("backfill", backfill);

  let advance = { instagramQueued: 0, facebookQueued: 0, skippedNoSocial: 0, examined: 0 };
  if (process.env.OUTBOUND_SEQUENCE_ADVANCE === "1") {
    // For testing / first wave: allow shorter wait via env (hours)
    const igAfterHours = Number(process.env.OUTBOUND_SEQUENCE_IG_AFTER_HOURS || "48") || 48;
    const fbAfterHours = Number(process.env.OUTBOUND_SEQUENCE_FB_AFTER_HOURS || "48") || 48;
    advance = await advanceOutboundSequences({
      workspaceRestaurantId: wid,
      igAfterHours,
      fbAfterHours,
      limit: 150,
    });
    console.log("advance", advance);
  }

  const igQueue = await prisma.outboundSequence.findMany({
    where: {
      workspaceRestaurantId: wid,
      instagramDmStatus: OutboundChannelStatus.QUEUED,
      sequenceStatus: OutboundSequenceStatus.INSTAGRAM_QUEUED,
    },
    orderBy: { emailSentAt: "asc" },
  });

  const fbQueue = await prisma.outboundSequence.findMany({
    where: {
      workspaceRestaurantId: wid,
      facebookMsgStatus: OutboundChannelStatus.QUEUED,
      sequenceStatus: OutboundSequenceStatus.FACEBOOK_QUEUED,
    },
    orderBy: { emailSentAt: "asc" },
  });

  const counts = await prisma.outboundSequence.groupBy({
    by: ["sequenceStatus"],
    where: { workspaceRestaurantId: wid },
    _count: { _all: true },
  });

  mkdirSync("downloads/outbound", { recursive: true });

  const igMd = [
    `# Instagram DM queue (${igQueue.length})`,
    ``,
    `Send from a real aged account. **No link in first DM.** Mark sent via:`,
    `\`OUTBOUND_SEQUENCE_MARK_IG=<id> npm run outbound:sequence-mark\``,
    ``,
    ...igQueue.map((q, i) => {
      return [
        `## ${i + 1}. ${q.restaurantName} (${q.city})`,
        `- Sequence id: \`${q.id}\``,
        `- Handle: @${q.instagramHandle ?? "?"} · ${q.instagramUrl}`,
        `- Angle: ${q.emailAngle}`,
        `- Observation: ${q.observation}`,
        ``,
        "```",
        q.instagramDmText ?? "",
        "```",
        ``,
      ].join("\n");
    }),
  ].join("\n");

  const fbMd = [
    `# Facebook Messenger queue (${fbQueue.length})`,
    ``,
    ...fbQueue.map((q, i) => {
      return [
        `## ${i + 1}. ${q.restaurantName} (${q.city})`,
        `- Sequence id: \`${q.id}\``,
        `- Page: ${q.facebookPageUrl}`,
        ``,
        "```",
        q.facebookMsgText ?? "",
        "```",
        ``,
      ].join("\n");
    }),
  ].join("\n");

  writeFileSync("downloads/outbound/ig-dm-queue.md", igMd);
  writeFileSync("downloads/outbound/fb-msg-queue.md", fbMd);
  writeFileSync(
    "downloads/outbound/sequence-status.json",
    JSON.stringify(
      {
        backfill,
        advance,
        byStatus: Object.fromEntries(counts.map((c) => [c.sequenceStatus, c._count._all])),
        igQueued: igQueue.length,
        fbQueued: fbQueue.length,
      },
      null,
      2,
    ),
  );

  // CSV for VA dialer-style sheet
  const igCsv = [
    "sequence_id,name,city,handle,instagram_url,angle,observation,dm_text",
    ...igQueue.map((q) =>
      [
        q.id,
        csv(q.restaurantName),
        csv(q.city),
        csv(q.instagramHandle),
        csv(q.instagramUrl),
        csv(q.emailAngle),
        csv(q.observation),
        csv(q.instagramDmText),
      ].join(","),
    ),
  ].join("\n");
  writeFileSync("downloads/outbound/ig-dm-queue.csv", igCsv);

  console.log(
    JSON.stringify(
      {
        sequences: Object.fromEntries(counts.map((c) => [c.sequenceStatus, c._count._all])),
        igQueued: igQueue.length,
        fbQueued: fbQueue.length,
        files: [
          "downloads/outbound/ig-dm-queue.md",
          "downloads/outbound/ig-dm-queue.csv",
          "downloads/outbound/fb-msg-queue.md",
          "downloads/outbound/sequence-status.json",
        ],
      },
      null,
      2,
    ),
  );
}

function csv(v: string | null | undefined): string {
  return `"${(v ?? "").replace(/"/g, '""')}"`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
