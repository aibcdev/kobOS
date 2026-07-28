/**
 * Phase 3 — surface approved offers on website / Google post channels.
 * Marks ChannelPublish rows; website banner becomes readable via live offers API.
 */

import { prisma } from "@/lib/db/prisma";

export async function publishLiveOfferChannels(liveOfferId: string): Promise<{
  website: "PUBLISHED" | "SKIPPED";
  googlePost: "QUEUED" | "SKIPPED";
}> {
  const offer = await prisma.liveOffer.findUnique({
    where: { id: liveOfferId },
    include: {
      channelPublishes: true,
      restaurant: { select: { googleBusinessUrl: true, website: true } },
    },
  });
  if (!offer) {
    return { website: "SKIPPED", googlePost: "SKIPPED" };
  }

  const now = new Date();
  let website: "PUBLISHED" | "SKIPPED" = "SKIPPED";
  let googlePost: "QUEUED" | "SKIPPED" = "SKIPPED";

  for (const ch of offer.channelPublishes) {
    if (ch.channel === "WEBSITE_BANNER") {
      await prisma.channelPublish.update({
        where: { id: ch.id },
        data: {
          status: "PUBLISHED",
          publishedAt: now,
          metadata: {
            ...(typeof ch.metadata === "object" && ch.metadata ? ch.metadata : {}),
            surface: "website_banner",
            note: offer.restaurant.website
              ? "Offer live for website banner / deals strip"
              : "Published internally — add a website to show guests",
          },
        },
      });
      website = "PUBLISHED";
    }

    if (ch.channel === "GOOGLE_POST") {
      const hasGbp = Boolean(offer.restaurant.googleBusinessUrl?.trim());
      if (hasGbp) {
        await prisma.channelPublish.update({
          where: { id: ch.id },
          data: {
            status: "QUEUED",
            metadata: {
              ...(typeof ch.metadata === "object" && ch.metadata ? ch.metadata : {}),
              note: "Queued for Google Business post — connector publishes when GBP is linked",
            },
          },
        });
        googlePost = "QUEUED";
      } else {
        await prisma.channelPublish.update({
          where: { id: ch.id },
          data: {
            status: "SKIPPED",
            metadata: {
              ...(typeof ch.metadata === "object" && ch.metadata ? ch.metadata : {}),
              note: "Skipped — link Google Business URL in Settings to publish posts",
            },
          },
        });
        googlePost = "SKIPPED";
      }
    }
  }

  return { website, googlePost };
}
