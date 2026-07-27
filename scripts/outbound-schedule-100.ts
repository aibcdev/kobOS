/**
 * Final gate for the verified 100:
 * 1) Export Variant A / Variant B as separate files
 * 2) HTTP-check every audit URL in the email body
 * 3) Approve + schedule via Resend for 7:00 BST
 *
 * Dry-run (default):
 *   npm run outbound:schedule-100
 *
 * Actually schedule:
 *   OUTBOUND_SCHEDULE_APPLY=1 npm run outbound:schedule-100
 *
 * Optional override:
 *   OUTBOUND_SCHEDULE_AT=2026-07-25T06:00:00.000Z
 */
import { OutboundLeadStatus } from "@prisma/client";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { prisma } from "../lib/db/prisma";
import { sendOutboundEmailViaResend } from "../lib/outbound/send-resend-outbound-email";

type CohortRow = {
  name: string;
  email: string | null;
  variant: "A" | "B";
  auditUrl: string;
  city?: string;
};

function nextSevenAmBstIso(): string {
  const override = process.env.OUTBOUND_SCHEDULE_AT?.trim();
  if (override) return override;

  // BST = UTC+1 → 07:00 BST = 06:00 UTC
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0, 0));
  // If we're already past today's 07:00 BST, schedule tomorrow
  if (now.getTime() >= target.getTime() - 60_000) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.toISOString();
}

async function httpOk(url: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "KOB-pre-send-url-check/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    const hasContent =
      text.includes("Overall") ||
      text.includes("visibility") ||
      text.includes("audit") ||
      text.includes("score") ||
      text.length > 5000;
    const soft404 = /not found|doesn.t exist/i.test(text.slice(0, 2000)) && res.status === 200;
    return { ok: res.status === 200 && hasContent && !soft404, status: res.status };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message };
  }
}

function extractAuditUrl(body: string | null, fallback: string | null): string | null {
  const fromBody = body?.match(/https?:\/\/[^\s]+\/audit\/[^\s]+/i)?.[0]?.trim();
  return fromBody || fallback?.trim() || null;
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const apply = process.env.OUTBOUND_SCHEDULE_APPLY === "1";
  const scheduledAt = nextSevenAmBstIso();
  const key = process.env.RESEND_API_KEY?.trim();

  const ab = JSON.parse(readFileSync("downloads/outbound/ab-split-100.json", "utf8")) as {
    rows: CohortRow[];
  };

  mkdirSync("downloads/outbound", { recursive: true });

  const leads = [];
  for (const row of ab.rows) {
    const lead = await prisma.outboundLead.findFirst({
      where: {
        workspaceRestaurantId: wid,
        restaurantName: row.name,
        contactEmail: row.email,
        status: { in: [OutboundLeadStatus.PENDING_APPROVAL, OutboundLeadStatus.APPROVED] },
      },
      select: {
        id: true,
        restaurantName: true,
        city: true,
        contactEmail: true,
        messageSubject: true,
        messageBody: true,
        auditUrl: true,
        emailVariant: true,
        status: true,
      },
    });
    if (!lead) {
      console.error(`MISSING lead: ${row.name} <${row.email}>`);
      continue;
    }
    leads.push({ ...lead, cohortVariant: row.variant });
  }

  if (leads.length !== 100) {
    throw new Error(`Expected 100 leads, resolved ${leads.length}`);
  }

  console.log(`Resolved ${leads.length} leads. Checking audit URLs…`);

  const checks = await mapPool(leads, 8, async (lead) => {
    const url = extractAuditUrl(lead.messageBody, lead.auditUrl);
    if (!url) {
      return { lead, url: null as string | null, ok: false, status: 0, error: "no_url_in_email" };
    }
    // URL in body must match stored auditUrl path
    const bodyPath = url.match(/\/audit\/([^?#\s]+)/)?.[1];
    const storedPath = lead.auditUrl?.match(/\/audit\/([^?#\s]+)/)?.[1];
    if (bodyPath && storedPath && bodyPath !== storedPath) {
      return { lead, url, ok: false, status: 0, error: `url_mismatch body=${bodyPath} stored=${storedPath}` };
    }
    const http = await httpOk(url);
    return { lead, url, ...http };
  });

  const broken = checks.filter((c) => !c.ok);
  const variantA = checks.filter((c) => (c.lead.emailVariant || c.lead.cohortVariant) === "A");
  const variantB = checks.filter((c) => (c.lead.emailVariant || c.lead.cohortVariant) === "B");

  function exportVariant(label: "A" | "B", items: typeof checks) {
    const json = items.map((c) => ({
      id: c.lead.id,
      name: c.lead.restaurantName,
      city: c.lead.city,
      email: c.lead.contactEmail,
      subject: c.lead.messageSubject,
      body: c.lead.messageBody,
      auditUrl: c.url,
      urlOk: c.ok,
    }));
    writeFileSync(`downloads/outbound/send-variant-${label.toLowerCase()}.json`, JSON.stringify(json, null, 2));
    const md = [
      `# Variant ${label} — ${items.length} emails`,
      "",
      ...items.map((c, i) => {
        return [
          `## ${i + 1}. ${c.lead.restaurantName}`,
          `- To: ${c.lead.contactEmail}`,
          `- Subject: ${c.lead.messageSubject}`,
          `- Audit: ${c.url} ${c.ok ? "✅" : "❌"}`,
          "",
          "```",
          c.lead.messageBody || "",
          "```",
          "",
        ].join("\n");
      }),
    ].join("\n");
    writeFileSync(`downloads/outbound/send-variant-${label.toLowerCase()}.md`, md);
  }

  exportVariant("A", variantA);
  exportVariant("B", variantB);

  const summary = {
    resolved: leads.length,
    variantA: variantA.length,
    variantB: variantB.length,
    urlsOk: checks.filter((c) => c.ok).length,
    urlsBroken: broken.length,
    broken: broken.map((b) => ({
      name: b.lead.restaurantName,
      email: b.lead.contactEmail,
      url: b.url,
      status: b.status,
      error: b.error,
    })),
    scheduledAt,
    apply,
  };
  writeFileSync("downloads/outbound/pre-send-check.json", JSON.stringify(summary, null, 2));

  console.log("\n=== PRE-SEND CHECK ===");
  console.log(JSON.stringify(summary, null, 2));

  if (broken.length) {
    throw new Error(`${broken.length} audit URL(s) failed — refusing to schedule`);
  }
  if (variantA.length !== 50 || variantB.length !== 50) {
    throw new Error(`Expected 50/50, got A=${variantA.length} B=${variantB.length}`);
  }

  if (!apply) {
    console.log("\nDry-run only. Re-run with OUTBOUND_SCHEDULE_APPLY=1 to approve + schedule for 7:00 BST.");
    console.log(`Would schedule at: ${scheduledAt} (${new Date(scheduledAt).toISOString()} = 07:00 BST)`);
    return;
  }

  if (!key) throw new Error("RESEND_API_KEY missing");

  console.log(`\nApproving + scheduling ${leads.length} emails for ${scheduledAt}…`);

  const results: { name: string; email: string; variant: string; resendId?: string; error?: string }[] = [];
  let scheduled = 0;
  let failed = 0;

  for (let i = 0; i < checks.length; i++) {
    const c = checks[i]!;
    const to = c.lead.contactEmail!.trim();
    const subject = c.lead.messageSubject?.trim() || "A note from KOB";
    const variant = (c.lead.emailVariant || c.lead.cohortVariant) as "A" | "B";

    await prisma.outboundLead.update({
      where: { id: c.lead.id },
      data: { status: OutboundLeadStatus.APPROVED },
    });

    const result = await sendOutboundEmailViaResend(key, {
      to,
      subject,
      body: c.lead.messageBody || "",
      scheduledAt,
      tags: [
        { name: "variant", value: variant },
        { name: "outbound", value: "1" },
        { name: "batch", value: "verified-100" },
      ],
    });

    if (!result.ok) {
      failed++;
      results.push({ name: c.lead.restaurantName || "", email: to, variant, error: result.error });
      console.error(`FAIL ${c.lead.restaurantName}: ${result.error}`);
      continue;
    }

    await prisma.outboundLead.update({
      where: { id: c.lead.id },
      data: {
        status: OutboundLeadStatus.SENT,
        insightSummary: `SCHEDULED ${scheduledAt} resend:${result.id ?? "unknown"}`.slice(0, 500),
      },
    });
    try {
      const { ensureOutboundSequenceForLead } = await import("../lib/outbound/run-outbound-sequence");
      await ensureOutboundSequenceForLead(c.lead.id);
    } catch (e) {
      console.warn("sequence create failed", c.lead.id, e);
    }
    scheduled++;
    results.push({ name: c.lead.restaurantName || "", email: to, variant, resendId: result.id });
    console.log(`${String(i + 1).padStart(3)}. scheduled ${variant}  ${c.lead.restaurantName}`);

    // polite pacing for Resend rate limits
    if (i < checks.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  writeFileSync(
    "downloads/outbound/schedule-result.json",
    JSON.stringify({ scheduledAt, scheduled, failed, results }, null, 2),
  );

  console.log("\n=== SCHEDULE RESULT ===");
  console.log(JSON.stringify({ scheduledAt, scheduled, failed }, null, 2));
  console.log("A/B exports: downloads/outbound/send-variant-a.md · send-variant-b.md");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
