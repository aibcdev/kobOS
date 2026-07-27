/**
 * Force verified send cohort to exact 50 A / 50 B, fix audit cities from leads,
 * and recompute restaurant scores so missing Google Place data doesn't invent
 * “hard to find” discovery claims.
 *
 *   npm run outbound:ab-split-100
 */
import { OutboundEmailVariant } from "@prisma/client";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { applyRestaurantScoresToPayload } from "../lib/audit/restaurant-scoring";
import { parseAuditPayload } from "../lib/audit/types";
import { prisma } from "../lib/db/prisma";
import { buildOutboundAbDraft } from "../lib/outbound/email-templates-ab";
import { buildAuditPublicUrl } from "../lib/outbound/ensure-outbound-audit";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const report = JSON.parse(readFileSync("downloads/outbound/ensure-100-audits.json", "utf8"));
  const names = (report.passedList as { name: string; email: string | null; auditUrl: string }[]).map(
    (p) => p.name,
  );

  const leads = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: "PENDING_APPROVAL",
      restaurantName: { in: names },
    },
    select: {
      id: true,
      restaurantName: true,
      city: true,
      contactEmail: true,
      auditUrl: true,
      visibilityAuditId: true,
      emailVariant: true,
      messageBody: true,
    },
    orderBy: [{ restaurantName: "asc" }, { id: "asc" }],
  });

  // Dedupe by name+email preferring report order
  const byKey = new Map(leads.map((l) => [`${l.restaurantName}|${(l.contactEmail || "").toLowerCase()}`, l]));
  const cohort: typeof leads = [];
  for (const p of report.passedList as { name: string; email: string | null }[]) {
    const key = `${p.name}|${(p.email || "").toLowerCase()}`;
    const lead = byKey.get(key) || leads.find((l) => l.restaurantName === p.name);
    if (lead && !cohort.find((c) => c.id === lead.id)) cohort.push(lead);
  }

  if (cohort.length !== 100) {
    console.warn(`Expected 100 cohort leads, got ${cohort.length}`);
  }

  // Stable sort then first 50 → A, rest → B
  cohort.sort((a, b) => {
    const an = (a.restaurantName || "").localeCompare(b.restaurantName || "");
    if (an !== 0) return an;
    return a.id.localeCompare(b.id);
  });

  let aCount = 0;
  let bCount = 0;
  const rows: { name: string; email: string | null; variant: string; auditUrl: string; city: string }[] = [];

  for (let i = 0; i < cohort.length; i++) {
    const lead = cohort[i]!;
    const variant = i < 50 ? OutboundEmailVariant.A : OutboundEmailVariant.B;
    if (variant === "A") aCount++;
    else bCount++;

    let pathKey = lead.auditUrl?.match(/\/audit\/([^/?#]+)/)?.[1] || null;
    if (lead.visibilityAuditId) {
      const audit = await prisma.visibilityAudit.findUnique({
        where: { id: lead.visibilityAuditId },
        select: { id: true, slug: true, city: true, resultPayload: true, restaurantName: true, websiteUrl: true },
      });
      if (audit) {
        pathKey = audit.slug?.trim() || audit.id;
        const city =
          lead.city?.trim() && lead.city.trim() !== "Your area"
            ? lead.city.trim()
            : audit.city?.trim() && audit.city.trim() !== "Your area"
              ? audit.city.trim()
              : audit.city;

        const payload = parseAuditPayload(audit.resultPayload);
        if (payload) {
          const rescored = applyRestaurantScoresToPayload(payload);
          await prisma.visibilityAudit.update({
            where: { id: audit.id },
            data: {
              city: city || audit.city,
              overallScore: rescored.restaurantScores?.overall ?? rescored.scores.overall,
              resultPayload: rescored as object,
            },
          });
        } else if (city && city !== audit.city) {
          await prisma.visibilityAudit.update({
            where: { id: audit.id },
            data: { city },
          });
        }
      }
    }

    const auditUrl = buildAuditPublicUrl(pathKey || lead.visibilityAuditId || "unknown", lead.contactEmail);
    const draft = buildOutboundAbDraft({
      stableId: lead.id,
      companyName: lead.restaurantName || "your restaurant",
      auditUrl,
      variant,
    });

    await prisma.outboundLead.update({
      where: { id: lead.id },
      data: {
        emailVariant: variant,
        auditUrl,
        messageSubject: draft.email_subject,
        messageBody: draft.message_body,
        suggestedTone: draft.suggested_tone,
      },
    });

    rows.push({
      name: lead.restaurantName || "",
      email: lead.contactEmail,
      variant,
      auditUrl,
      city: lead.city || "",
    });
    console.log(`${String(i + 1).padStart(3)}. ${variant}  ${lead.restaurantName}`);
  }

  mkdirSync("downloads/outbound", { recursive: true });
  writeFileSync(
    "downloads/outbound/ab-split-100.json",
    JSON.stringify({ aCount, bCount, total: rows.length, rows }, null, 2),
  );

  const md = [
    `# Verified send list — 50 A / 50 B (${rows.length})`,
    "",
    "## Variant A",
    ...rows.filter((r) => r.variant === "A").map((r, i) => `${i + 1}. **${r.name}** — ${r.email ?? "—"} — ${r.auditUrl}`),
    "",
    "## Variant B",
    ...rows.filter((r) => r.variant === "B").map((r, i) => `${i + 1}. **${r.name}** — ${r.email ?? "—"} — ${r.auditUrl}`),
    "",
  ].join("\n");
  writeFileSync("downloads/outbound/verified-send-list.md", md);

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify({ total: rows.length, aCount, bCount }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
