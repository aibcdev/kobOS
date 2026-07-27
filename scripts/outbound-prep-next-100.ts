/**
 * Prepare the next N PENDING leads for the daily 100 send:
 * - ensure audit scanStatus=ready (already-ready first, then parallel pipeline)
 * - 50/50 A/B + email bodies with working audit URLs
 * - promote to APPROVED for the daily send cron
 *
 *   OUTBOUND_PREP_LIMIT=100 OUTBOUND_PREP_APPROVE=1 npm run outbound:prep-next-100
 */
import { OutboundEmailVariant, OutboundLeadStatus } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { executeAuditPipeline } from "../lib/audit/execute-audit-pipeline";
import { parseAuditPayload } from "../lib/audit/types";
import { prisma } from "../lib/db/prisma";
import { buildOutboundAbDraft } from "../lib/outbound/email-templates-ab";
import { buildAuditPublicUrl } from "../lib/outbound/ensure-outbound-audit";

const LIMIT = Math.max(1, Number(process.env.OUTBOUND_PREP_LIMIT || "100") || 100);
const APPROVE = process.env.OUTBOUND_PREP_APPROVE !== "0";
const PIPELINE_CONCURRENCY = Math.min(
  6,
  Math.max(1, Number(process.env.OUTBOUND_PREP_PIPELINE_CONCURRENCY || "3") || 3),
);

type LeadRow = {
  id: string;
  restaurantName: string | null;
  city: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  auditUrl: string | null;
  visibilityAuditId: string | null;
  placeId: string | null;
  emailVariant: OutboundEmailVariant | null;
  messageBody: string | null;
  scanReady?: boolean;
};

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker()));
  return results;
}

async function ensureAuditReady(lead: LeadRow) {
  const auditId = lead.visibilityAuditId!;
  const audit = await prisma.visibilityAudit.findUnique({
    where: { id: auditId },
    select: { id: true, websiteUrl: true, restaurantName: true, resultPayload: true, slug: true, city: true },
  });
  if (!audit?.websiteUrl) return { ok: false as const, reason: "no_website", slug: null as string | null };
  const payload = parseAuditPayload(audit.resultPayload);
  if (payload?.scanStatus === "ready") {
    return { ok: true as const, slug: audit.slug, alreadyReady: true };
  }
  console.log(`  pipeline ${audit.slug || audit.id}`);
  await executeAuditPipeline(audit.id, {
    websiteUrl: audit.websiteUrl,
    siteScope: "one",
    fallbackCity: lead.city || audit.city,
    place: { name: audit.restaurantName, placeId: lead.placeId ?? undefined },
  });
  const refreshed = await prisma.visibilityAudit.findUnique({
    where: { id: auditId },
    select: { slug: true, resultPayload: true },
  });
  const scan = parseAuditPayload(refreshed?.resultPayload)?.scanStatus;
  if (scan !== "ready") return { ok: false as const, reason: `scan_${scan ?? "unknown"}`, slug: refreshed?.slug ?? audit.slug };
  return { ok: true as const, slug: refreshed?.slug ?? audit.slug, alreadyReady: false };
}

async function httpOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "KOB-prep-next-100/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    const text = await res.text();
    return res.status === 200 && (text.length > 5000 || /audit|visibility|score|Overall/i.test(text));
  } catch {
    return false;
  }
}

async function finalizeLead(
  lead: LeadRow,
  variant: OutboundEmailVariant,
  slug: string | null,
): Promise<{
  id: string;
  name: string;
  email: string | null;
  variant: string;
  auditUrl: string;
  urlOk: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  const pathKey = slug || lead.visibilityAuditId!;
  const auditUrl = buildAuditPublicUrl(pathKey, lead.contactEmail);
  const draft = buildOutboundAbDraft({
    stableId: lead.id,
    companyName: lead.restaurantName || "your restaurant",
    auditUrl,
    variant,
  });
  const urlOk = await httpOk(auditUrl);
  if (!urlOk) issues.push("http_fail");

  await prisma.outboundLead.update({
    where: { id: lead.id },
    data: {
      auditUrl,
      emailVariant: variant,
      messageSubject: draft.email_subject,
      messageBody: draft.message_body,
      suggestedTone: draft.suggested_tone,
      ...(APPROVE && urlOk && issues.length === 0 ? { status: OutboundLeadStatus.APPROVED } : {}),
    },
  });

  if (lead.city && lead.city !== "Your area" && lead.visibilityAuditId) {
    await prisma.visibilityAudit
      .update({ where: { id: lead.visibilityAuditId }, data: { city: lead.city } })
      .catch(() => undefined);
  }

  return {
    id: lead.id,
    name: lead.restaurantName || "",
    email: lead.contactEmail,
    variant,
    auditUrl,
    urlOk,
    issues,
  };
}

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  const candidates = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId: wid,
      status: OutboundLeadStatus.PENDING_APPROVAL,
      contactEmail: { not: null },
      websiteUrl: { not: null },
      visibilityAuditId: { not: null },
    },
    orderBy: [{ createdAt: "asc" }, { restaurantName: "asc" }],
    take: LIMIT * 3,
    select: {
      id: true,
      restaurantName: true,
      city: true,
      contactEmail: true,
      websiteUrl: true,
      auditUrl: true,
      visibilityAuditId: true,
      placeId: true,
      emailVariant: true,
      messageBody: true,
    },
  });

  const auditIds = [...new Set(candidates.map((c) => c.visibilityAuditId!).filter(Boolean))];
  const audits = await prisma.visibilityAudit.findMany({
    where: { id: { in: auditIds } },
    select: { id: true, resultPayload: true, slug: true },
  });
  const readyMap = new Map(
    audits.map((a) => [a.id, parseAuditPayload(a.resultPayload)?.scanStatus === "ready"] as const),
  );
  const slugMap = new Map(audits.map((a) => [a.id, a.slug] as const));

  const annotated: LeadRow[] = candidates.map((c) => ({
    ...c,
    scanReady: Boolean(c.visibilityAuditId && readyMap.get(c.visibilityAuditId)),
  }));

  // Prefer already-ready audits so tomorrow’s 100 fills fast
  annotated.sort((a, b) => Number(b.scanReady) - Number(a.scanReady) || (a.restaurantName || "").localeCompare(b.restaurantName || ""));
  const cohort = annotated.slice(0, LIMIT);

  const alreadyReady = cohort.filter((c) => c.scanReady);
  const needsPipeline = cohort.filter((c) => !c.scanReady);
  console.log(
    JSON.stringify(
      {
        preparing: cohort.length,
        alreadyReady: alreadyReady.length,
        needsPipeline: needsPipeline.length,
        pipelineConcurrency: PIPELINE_CONCURRENCY,
        approve: APPROVE,
      },
      null,
      2,
    ),
  );

  // Stable 50/50 after final cohort order
  const withVariant = cohort.map((lead, i) => ({
    lead,
    variant: (i < Math.ceil(cohort.length / 2) ? "A" : "B") as OutboundEmailVariant,
  }));

  const prepared: Awaited<ReturnType<typeof finalizeLead>>[] = [];

  // Phase 1 — already ready (parallel HTTP + DB)
  console.log(`Phase 1: finalize ${alreadyReady.length} ready audits…`);
  const phase1 = withVariant.filter((x) => x.lead.scanReady);
  const p1 = await mapPool(phase1, 8, async ({ lead, variant }, i) => {
    console.log(`  ${String(i + 1).padStart(3)}. ready  ${lead.restaurantName}`);
    return finalizeLead(lead, variant, slugMap.get(lead.visibilityAuditId!) ?? null);
  });
  prepared.push(...p1);

  // Phase 2 — run pipelines in parallel, then finalize
  console.log(`Phase 2: pipeline ${needsPipeline.length}…`);
  const phase2 = withVariant.filter((x) => !x.lead.scanReady);
  const p2 = await mapPool(phase2, PIPELINE_CONCURRENCY, async ({ lead, variant }, i) => {
    console.log(`  ${String(i + 1).padStart(3)}. scan   ${lead.restaurantName}`);
    const ready = await ensureAuditReady(lead);
    if (!ready.ok) {
      return {
        id: lead.id,
        name: lead.restaurantName || "",
        email: lead.contactEmail,
        variant,
        auditUrl: lead.auditUrl || "",
        urlOk: false,
        issues: [ready.reason],
      };
    }
    return finalizeLead(lead, variant, ready.slug ?? null);
  });
  prepared.push(...p2);

  const ok = prepared.filter((p) => p.urlOk && p.issues.length === 0);
  const a = ok.filter((p) => p.variant === "A").length;
  const b = ok.filter((p) => p.variant === "B").length;

  mkdirSync("downloads/outbound", { recursive: true });
  writeFileSync(
    "downloads/outbound/next-100-prep.json",
    JSON.stringify(
      {
        prepared: prepared.length,
        ready: ok.length,
        a,
        b,
        approved: APPROVE,
        failed: prepared.filter((p) => !p.urlOk || p.issues.length),
        rows: prepared,
      },
      null,
      2,
    ),
  );

  const md = [
    `# Next send batch (${ok.length} ready)`,
    ``,
    `Approved for daily cron: **${APPROVE ? "yes" : "no"}** · A ${a} / B ${b}`,
    ``,
    `## Ready`,
    ...ok.map((p, i) => `${i + 1}. **${p.name}** [${p.variant}] — ${p.email} — ${p.auditUrl}`),
    ``,
    `## Failed / incomplete`,
    ...prepared
      .filter((p) => !p.urlOk || p.issues.length)
      .map((p) => `- ${p.name}: ${p.issues.join("; ") || "url_fail"}`),
    ``,
  ].join("\n");
  writeFileSync("downloads/outbound/next-100-prep.md", md);

  console.log(
    JSON.stringify(
      {
        prepared: prepared.length,
        ready: ok.length,
        a,
        b,
        approved: APPROVE,
        failed: prepared.length - ok.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
