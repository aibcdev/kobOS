/**
 * Export all SENT outbound leads as a call list (phone from linked prospect when available).
 *
 *   npm run outbound:call-list
 */
import { mkdirSync, writeFileSync } from "fs";
import { prisma } from "../lib/db/prisma";

function isLikelyUkMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const d = phone.replace(/[\s()-]/g, "");
  return /^(?:\+?44|0)7\d{9}$/.test(d);
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const sent = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: "SENT" },
    orderBy: [{ emailVariant: "asc" }, { restaurantName: "asc" }],
    select: {
      id: true,
      restaurantName: true,
      city: true,
      contactEmail: true,
      emailVariant: true,
      auditUrl: true,
      websiteUrl: true,
      placeId: true,
      messageSubject: true,
      insightSummary: true,
      createdAt: true,
      leadProspect: {
        select: {
          contactPhone: true,
          instagramUrl: true,
          facebookUrl: true,
          kobOpportunityScore: true,
        },
      },
    },
  });

  const rows = sent.map((s, i) => {
    const phone = s.leadProspect?.contactPhone?.trim() || null;
    return {
      n: i + 1,
      name: s.restaurantName,
      city: s.city,
      email: s.contactEmail,
      phone,
      mobileLikely: isLikelyUkMobile(phone),
      variant: s.emailVariant,
      subject: s.messageSubject,
      auditUrl: s.auditUrl,
      website: s.websiteUrl,
      instagram: s.leadProspect?.instagramUrl ?? null,
      facebook: s.leadProspect?.facebookUrl ?? null,
      icpScore: s.leadProspect?.kobOpportunityScore ?? null,
      sentNote: s.insightSummary,
    };
  });

  mkdirSync("downloads/outbound", { recursive: true });
  writeFileSync("downloads/outbound/call-list.json", JSON.stringify({ total: rows.length, rows }, null, 2));

  const withPhone = rows.filter((r) => r.phone);
  const mobiles = rows.filter((r) => r.mobileLikely);

  const md = [
    `# Call list — already emailed (${rows.length})`,
    ``,
    `These restaurants were in the first outbound send. Call in a few days.`,
    ``,
    `| Metric | Count |`,
    `|---|---:|`,
    `| Emailed (SENT) | ${rows.length} |`,
    `| With phone on file | ${withPhone.length} |`,
    `| Likely UK mobile (07 / +447) | ${mobiles.length} |`,
    `| Variant A | ${rows.filter((r) => r.variant === "A").length} |`,
    `| Variant B | ${rows.filter((r) => r.variant === "B").length} |`,
    ``,
    `## Priority: has phone`,
    ``,
    `| # | Restaurant | City | Phone | Mobile? | Email | Variant | Audit |`,
    `|---:|---|---|---|---|---|---|---|`,
    ...withPhone.map(
      (r) =>
        `| ${r.n} | ${r.name} | ${r.city ?? ""} | ${r.phone} | ${r.mobileLikely ? "yes" : "landline?"} | ${r.email ?? ""} | ${r.variant ?? ""} | ${r.auditUrl ?? ""} |`,
    ),
    ``,
    `## No phone — email / IG / FB only`,
    ``,
    ...rows
      .filter((r) => !r.phone)
      .map(
        (r) =>
          `- **${r.name}** (${r.city ?? "—"}) · ${r.email ?? "—"} · IG: ${r.instagram ?? "—"} · FB: ${r.facebook ?? "—"} · ${r.auditUrl ?? ""}`,
      ),
    ``,
  ].join("\n");

  writeFileSync("downloads/outbound/call-list.md", md);

  // CSV for dialer / sheets
  const csv = [
    "n,name,city,phone,mobile_likely,email,variant,audit_url,website,instagram,facebook,icp_score",
    ...rows.map((r) =>
      [
        r.n,
        csvEscape(r.name),
        csvEscape(r.city),
        csvEscape(r.phone),
        r.mobileLikely ? "1" : "0",
        csvEscape(r.email),
        r.variant ?? "",
        csvEscape(r.auditUrl),
        csvEscape(r.website),
        csvEscape(r.instagram),
        csvEscape(r.facebook),
        r.icpScore ?? "",
      ].join(","),
    ),
  ].join("\n");
  writeFileSync("downloads/outbound/call-list.csv", csv);

  console.log(
    JSON.stringify(
      {
        total: rows.length,
        withPhone: withPhone.length,
        likelyMobile: mobiles.length,
        files: [
          "downloads/outbound/call-list.md",
          "downloads/outbound/call-list.csv",
          "downloads/outbound/call-list.json",
        ],
      },
      null,
      2,
    ),
  );
}

function csvEscape(v: string | null | undefined): string {
  const s = (v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
