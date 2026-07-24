#!/usr/bin/env npx tsx
import { prisma } from "@/lib/db/prisma";
import { buildAuditPublicUrl } from "@/lib/outbound/ensure-outbound-audit";
import { generateOutboundAbEmail } from "@/lib/outbound/generate-uk-cold-draft";
import { slugify } from "@/lib/utils/slugify";

async function main() {
  const audits = await prisma.visibilityAudit.findMany({
    where: { slug: { not: null } },
    select: { id: true, slug: true, restaurantName: true },
  });

  let fixed = 0;
  for (const a of audits) {
    const desired = slugify(a.restaurantName.replace(/['’]/g, ""));
    if (!desired || desired === a.slug) continue;
    const clash = await prisma.visibilityAudit.findUnique({
      where: { slug: desired },
      select: { id: true },
    });
    if (clash && clash.id !== a.id) continue;
    await prisma.visibilityAudit.update({ where: { id: a.id }, data: { slug: desired } });
    fixed++;
  }

  const leads = await prisma.outboundLead.findMany({
    where: { visibilityAuditId: { not: null }, auditUrl: { not: null } },
    select: {
      id: true,
      restaurantName: true,
      contactEmail: true,
      visibilityAuditId: true,
      emailVariant: true,
    },
  });

  for (const lead of leads) {
    const audit = await prisma.visibilityAudit.findUnique({
      where: { id: lead.visibilityAuditId! },
      select: { slug: true },
    });
    if (!audit?.slug || !lead.restaurantName) continue;
    const auditUrl = buildAuditPublicUrl(audit.slug, lead.contactEmail);
    const draft = generateOutboundAbEmail({
      stableId: lead.id,
      companyName: lead.restaurantName,
      auditUrl,
      variant: lead.emailVariant ?? undefined,
    });
    await prisma.outboundLead.update({
      where: { id: lead.id },
      data: {
        auditUrl,
        messageSubject: draft.email_subject,
        messageBody: draft.message_body,
      },
    });
  }

  console.log({ auditsFixed: fixed, leadsUpdated: leads.length });
  const ali = await prisma.outboundLead.findFirst({
    where: { restaurantName: { contains: "Ali", mode: "insensitive" } },
    select: { auditUrl: true, messageSubject: true, messageBody: true },
  });
  console.log(JSON.stringify(ali, null, 2));
}

main().finally(() => prisma.$disconnect());
