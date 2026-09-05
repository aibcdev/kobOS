/**
 * One-shot: promote ready PENDING → APPROVED and send via Resend (up to remaining daily cap).
 * Bypasses Inngest when cron keys are missing.
 *
 *   OUTBOUND_SEND_NOW=1 npm run outbound:send-now
 */
import { OutboundLeadStatus } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { prisma } from "../lib/db/prisma";
import { countOutboundSentUtcDay } from "../lib/outbound/count-sent-today";
import {
  loadSentContactSets,
  normalizeOutboundEmail,
  pickUniqueFreshLeads,
} from "../lib/outbound/outbound-send-dedupe";
import { promoteReadyOutboundBatch } from "../lib/outbound/promote-ready-batch";
import { sendOutboundEmailViaResend } from "../lib/outbound/send-resend-outbound-email";
import {
  getOutboundPerRunCap,
  getOutboundSendBatch,
  getOutboundSendDelaySec,
  remainingSendForDay,
} from "../lib/outbound/send-volume";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const apply = process.env.OUTBOUND_SEND_NOW === "1";
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY missing");

  const sentToday = await countOutboundSentUtcDay(wid);
  const remaining = remainingSendForDay(sentToday);
  const batch = Math.min(getOutboundSendBatch(), getOutboundPerRunCap(), remaining);
  const delaySec = getOutboundSendDelaySec();
  if (batch <= 0) {
    console.log(JSON.stringify({ apply, sentToday, remaining: 0, message: "daily_cap_reached" }));
    return;
  }

  let promoted = { promoted: 0, ids: [] as string[] };
  if (apply) {
    const already = await prisma.outboundLead.count({
      where: {
        workspaceRestaurantId: wid,
        status: OutboundLeadStatus.APPROVED,
        contactEmail: { not: null },
        messageBody: { not: null },
      },
    });
    const need = Math.max(0, batch - already);
    if (need > 0) {
      promoted = await promoteReadyOutboundBatch({ workspaceRestaurantId: wid, limit: need });
    }
  }

  const leads = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: OutboundLeadStatus.APPROVED,
      contactEmail: { not: null },
      messageBody: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: batch * 4,
  });
  const sentContacts = await loadSentContactSets(wid);
  const { picked: eligible, skipped: sendSkipped } = pickUniqueFreshLeads(leads, sentContacts, batch);

  console.log(
    JSON.stringify(
      {
        apply,
        promoted: promoted.promoted,
        eligible: eligible.length,
        sendSkipped,
        sample: eligible.slice(0, 3).map((l) => ({
          name: l.restaurantName,
          email: normalizeOutboundEmail(l.contactEmail),
          variant: l.emailVariant,
        })),
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("Dry run — set OUTBOUND_SEND_NOW=1 to send.");
    return;
  }
  if (!eligible.length) {
    console.log("Nothing to send.");
    return;
  }

  const results: Array<{ id: string; email: string; ok: boolean; error?: string; resendId?: string }> = [];
  for (let i = 0; i < eligible.length; i++) {
    const lead = eligible[i]!;
    const to = normalizeOutboundEmail(lead.contactEmail) || lead.contactEmail!.trim();
    const subject = lead.messageSubject?.trim() || "A note from KOB";
    const result = await sendOutboundEmailViaResend(key, {
      to,
      subject,
      body: lead.messageBody || "",
      tags: lead.emailVariant
        ? [
            { name: "variant", value: lead.emailVariant },
            { name: "outbound", value: "1" },
          ]
        : [{ name: "outbound", value: "1" }],
    });
    if (!result.ok) {
      results.push({ id: lead.id, email: to, ok: false, error: result.error });
      console.error(`FAIL ${to}: ${result.error}`);
    } else {
      await prisma.outboundLead.update({
        where: { id: lead.id },
        data: {
          status: OutboundLeadStatus.SENT,
          insightSummary: `SENT send-now ${new Date().toISOString()} resend:${result.id ?? "ok"}`.slice(
            0,
            500,
          ),
        },
      });
      try {
        const { ensureOutboundSequenceForLead } = await import("../lib/outbound/run-outbound-sequence");
        await ensureOutboundSequenceForLead(lead.id);
      } catch (e) {
        console.warn("sequence create failed", lead.id, e);
      }
      results.push({ id: lead.id, email: to, ok: true, resendId: result.id });
      console.log(`[${i + 1}/${eligible.length}] sent ${to}`);
    }
    if (i < eligible.length - 1) await sleep(delaySec * 1000);
  }

  mkdirSync("downloads/outbound", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const path = `downloads/outbound/send-now-${stamp}.json`;
  writeFileSync(
    path,
    JSON.stringify(
      {
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        promoted: promoted.promoted,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${path}`);
  console.log(`Done. sent=${results.filter((r) => r.ok).length} failed=${results.filter((r) => !r.ok).length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
