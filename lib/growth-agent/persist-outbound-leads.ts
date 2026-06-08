import { OutboundLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { OutboundDraftJson } from "@/lib/growth-agent/outbound-draft-schema";

export async function persistOutboundDraftLeads(
  workspaceRestaurantId: string,
  city: string,
  leads: OutboundDraftJson["leads"],
) {
  const trimmedCity = city.trim();
  return prisma.$transaction(
    leads.map((lead) =>
      prisma.outboundLead.create({
        data: {
          workspaceRestaurantId,
          city: trimmedCity,
          restaurantName: lead.restaurant_name_guess,
          websiteUrl: lead.website_url?.trim() || null,
          insightSummary: `${lead.visible_problem}\n\nChannel: ${lead.channel}`,
          messageSubject: lead.email_subject,
          messageBody: lead.message_body,
          suggestedTone: lead.suggested_tone,
          status: OutboundLeadStatus.PENDING_APPROVAL,
        },
      }),
    ),
  );
}
