import {
  OutboundChannelStatus,
  OutboundLeadStatus,
  OutboundSequenceStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  generateFacebookMsg,
  generateInstagramDm,
  cleanFacebookPageUrl,
  instagramHandleFromUrl,
  normalizeSequenceAngle,
} from "@/lib/outbound/sequence-messages";

type ScoreBreakdown = {
  recommended_email_angle?: string | null;
  personalization_hooks?: string[];
  matched_factors?: string[];
};

function observationFromProspect(input: {
  opportunities: string[];
  scoreBreakdown: unknown;
  insightSummary?: string | null;
}): { observation: string; emailAngle: string } {
  const breakdown =
    input.scoreBreakdown && typeof input.scoreBreakdown === "object"
      ? (input.scoreBreakdown as ScoreBreakdown)
      : {};
  const hooks = Array.isArray(breakdown.personalization_hooks)
    ? breakdown.personalization_hooks.filter((h) => typeof h === "string" && h.trim())
    : [];
  const fromOpp = input.opportunities.map((o) => o.trim()).filter(Boolean);
  const observation =
    hooks[0] ||
    fromOpp[0] ||
    input.insightSummary?.replace(/^[^·]+·\s*/, "").trim() ||
    "a few gaps online when guests decide where to eat";
  const emailAngle = normalizeSequenceAngle(
    breakdown.recommended_email_angle ||
      (observation.toLowerCase().includes("review")
        ? "review_response"
        : observation.toLowerCase().includes("instagram")
          ? "inactive_social"
          : observation.toLowerCase().includes("website")
            ? "dated_website"
            : "general"),
  );
  return { observation: observation.slice(0, 400), emailAngle };
}

/** Create or refresh sequence row when an outbound email is marked SENT. */
export async function ensureOutboundSequenceForLead(outboundLeadId: string): Promise<void> {
  const lead = await prisma.outboundLead.findUnique({
    where: { id: outboundLeadId },
    include: {
      leadProspect: {
        select: {
          name: true,
          city: true,
          instagramUrl: true,
          facebookUrl: true,
          opportunities: true,
          scoreBreakdown: true,
        },
      },
      sequence: { select: { id: true } },
    },
  });
  if (!lead || lead.status !== OutboundLeadStatus.SENT) return;
  if (lead.sequence) return;

  const prospect = lead.leadProspect;
  const { observation, emailAngle } = observationFromProspect({
    opportunities: prospect?.opportunities ?? [],
    scoreBreakdown: prospect?.scoreBreakdown ?? {},
    insightSummary: lead.insightSummary,
  });
  const name = lead.restaurantName || prospect?.name || "Restaurant";
  const city = lead.city || prospect?.city || "";
  const igUrl = prospect?.instagramUrl?.trim() || null;
  const fbUrl = cleanFacebookPageUrl(prospect?.facebookUrl);

  const emailSentAt = lead.createdAt; // best available if we didn't store send time separately
  // Prefer SCHEDULED/SENT timestamp from insightSummary when present
  const scheduledMatch = lead.insightSummary?.match(
    /(?:SCHEDULED|SENT)[^\d]*(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/i,
  );
  const parsedSend = scheduledMatch?.[1] ? new Date(scheduledMatch[1]) : null;
  const sentAt =
    parsedSend && !Number.isNaN(parsedSend.getTime()) ? parsedSend : emailSentAt;

  await prisma.outboundSequence.create({
    data: {
      outboundLeadId: lead.id,
      workspaceRestaurantId: lead.workspaceRestaurantId,
      restaurantName: name,
      city,
      observation,
      emailAngle,
      emailSentAt: sentAt,
      instagramUrl: igUrl,
      instagramHandle: instagramHandleFromUrl(igUrl),
      facebookPageUrl: fbUrl,
      sequenceStatus: OutboundSequenceStatus.EMAIL_SENT,
      instagramDmStatus: igUrl ? OutboundChannelStatus.PENDING : OutboundChannelStatus.SKIPPED,
      facebookMsgStatus: fbUrl ? OutboundChannelStatus.PENDING : OutboundChannelStatus.SKIPPED,
    },
  });
}

export type AdvanceSequenceResult = {
  instagramQueued: number;
  facebookQueued: number;
  skippedNoSocial: number;
  examined: number;
};

/**
 * Daily advancement:
 * - Day 2–3 after email → queue Instagram DM (if handle + no reply)
 * - Day 2 after IG sent / no IG → queue Facebook
 */
export async function advanceOutboundSequences(input?: {
  workspaceRestaurantId?: string;
  /** Hours after email before IG (default 48). */
  igAfterHours?: number;
  /** Hours after IG sent (or email if no IG) before FB (default 48). */
  fbAfterHours?: number;
  limit?: number;
}): Promise<AdvanceSequenceResult> {
  const igAfterMs = (input?.igAfterHours ?? 48) * 3600_000;
  const fbAfterMs = (input?.fbAfterHours ?? 48) * 3600_000;
  const limit = Math.min(200, Math.max(1, input?.limit ?? 80));
  const now = Date.now();
  const igCutoff = new Date(now - igAfterMs);
  const fbCutoff = new Date(now - fbAfterMs);

  const whereBase: Prisma.OutboundSequenceWhereInput = {
    emailReplied: false,
    sequenceStatus: {
      notIn: [
        OutboundSequenceStatus.REPLIED,
        OutboundSequenceStatus.COMPLETED,
        OutboundSequenceStatus.STOPPED,
      ],
    },
    ...(input?.workspaceRestaurantId
      ? { workspaceRestaurantId: input.workspaceRestaurantId }
      : {}),
  };

  let instagramQueued = 0;
  let facebookQueued = 0;
  let skippedNoSocial = 0;
  let examined = 0;

  // Instagram: email sent long enough ago, still EMAIL_SENT, IG pending
  const igCandidates = await prisma.outboundSequence.findMany({
    where: {
      ...whereBase,
      sequenceStatus: OutboundSequenceStatus.EMAIL_SENT,
      emailSentAt: { lte: igCutoff },
      instagramDmStatus: OutboundChannelStatus.PENDING,
    },
    orderBy: { emailSentAt: "asc" },
    take: limit,
  });

  for (const row of igCandidates) {
    examined++;
    if (!row.instagramUrl) {
      // Skip straight toward Facebook path
      await prisma.outboundSequence.update({
        where: { id: row.id },
        data: {
          instagramDmStatus: OutboundChannelStatus.SKIPPED,
          sequenceStatus: row.facebookPageUrl
            ? OutboundSequenceStatus.READY_FOR_FACEBOOK
            : OutboundSequenceStatus.COMPLETED,
          stopReason: row.facebookPageUrl ? null : "no_instagram_or_facebook",
        },
      });
      if (!row.facebookPageUrl) skippedNoSocial++;
      continue;
    }

    const dm = generateInstagramDm({
      name: row.restaurantName,
      city: row.city,
      observation: row.observation,
      emailAngle: row.emailAngle,
    });

    await prisma.outboundSequence.update({
      where: { id: row.id },
      data: {
        instagramDmText: dm,
        instagramDmStatus: OutboundChannelStatus.QUEUED,
        instagramDmQueuedAt: new Date(),
        sequenceStatus: OutboundSequenceStatus.INSTAGRAM_QUEUED,
      },
    });
    instagramQueued++;
  }

  // Facebook: IG sent/skipped long enough, or READY_FOR_FACEBOOK
  const fbCandidates = await prisma.outboundSequence.findMany({
    where: {
      ...whereBase,
      facebookMsgStatus: OutboundChannelStatus.PENDING,
      OR: [
        {
          sequenceStatus: OutboundSequenceStatus.READY_FOR_FACEBOOK,
          emailSentAt: { lte: fbCutoff },
        },
        {
          sequenceStatus: OutboundSequenceStatus.INSTAGRAM_SENT,
          instagramDmSentAt: { lte: fbCutoff },
        },
        {
          // IG was skipped (no handle) — wait from email time
          instagramDmStatus: OutboundChannelStatus.SKIPPED,
          sequenceStatus: {
            in: [OutboundSequenceStatus.EMAIL_SENT, OutboundSequenceStatus.READY_FOR_FACEBOOK],
          },
          emailSentAt: { lte: fbCutoff },
          facebookPageUrl: { not: null },
        },
      ],
    },
    orderBy: { emailSentAt: "asc" },
    take: limit,
  });

  for (const row of fbCandidates) {
    examined++;
    if (!row.facebookPageUrl) {
      await prisma.outboundSequence.update({
        where: { id: row.id },
        data: {
          facebookMsgStatus: OutboundChannelStatus.SKIPPED,
          sequenceStatus: OutboundSequenceStatus.COMPLETED,
          stopReason: "no_facebook",
        },
      });
      skippedNoSocial++;
      continue;
    }

    const msg = generateFacebookMsg({
      name: row.restaurantName,
      city: row.city,
      observation: row.observation,
      emailAngle: row.emailAngle,
    });

    await prisma.outboundSequence.update({
      where: { id: row.id },
      data: {
        facebookMsgText: msg,
        facebookMsgStatus: OutboundChannelStatus.QUEUED,
        facebookMsgQueuedAt: new Date(),
        sequenceStatus: OutboundSequenceStatus.FACEBOOK_QUEUED,
      },
    });
    facebookQueued++;
  }

  return { instagramQueued, facebookQueued, skippedNoSocial, examined };
}

/** Human/VA marks an Instagram DM as sent from the hybrid queue. */
export async function markInstagramDmSent(sequenceId: string): Promise<void> {
  await prisma.outboundSequence.update({
    where: { id: sequenceId },
    data: {
      instagramDmStatus: OutboundChannelStatus.SENT,
      instagramDmSentAt: new Date(),
      sequenceStatus: OutboundSequenceStatus.INSTAGRAM_SENT,
    },
  });
}

export async function markFacebookMsgSent(sequenceId: string): Promise<void> {
  await prisma.outboundSequence.update({
    where: { id: sequenceId },
    data: {
      facebookMsgStatus: OutboundChannelStatus.SENT,
      facebookMsgSentAt: new Date(),
      sequenceStatus: OutboundSequenceStatus.FACEBOOK_SENT,
    },
  });
}

/** Stop sequence on any positive reply (email / IG / FB). */
export async function markSequenceReplied(
  sequenceId: string,
  channel: "email" | "instagram" | "facebook",
): Promise<void> {
  await prisma.outboundSequence.update({
    where: { id: sequenceId },
    data: {
      ...(channel === "email" ? { emailReplied: true } : {}),
      sequenceStatus: OutboundSequenceStatus.REPLIED,
      stopReason: `replied_via_${channel}`,
      ...(channel === "instagram"
        ? { instagramDmStatus: OutboundChannelStatus.REPLIED }
        : {}),
      ...(channel === "facebook" ? { facebookMsgStatus: OutboundChannelStatus.REPLIED } : {}),
    },
  });
}

export async function backfillSequencesForSentLeads(workspaceRestaurantId: string): Promise<{
  created: number;
  skipped: number;
}> {
  const sent = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId,
      status: OutboundLeadStatus.SENT,
      sequence: null,
    },
    select: { id: true },
    take: 500,
  });
  let created = 0;
  for (const row of sent) {
    await ensureOutboundSequenceForLead(row.id);
    created++;
  }
  return { created, skipped: 0 };
}
