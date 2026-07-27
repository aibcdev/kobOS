/**
 * Top verified PENDING cohort to 100, ensure each audit is scan-ready,
 * rewrite email bodies with working /audit/{slug}?email= URLs, HTTP-check them.
 *
 *   npm run outbound:ensure-100-audits
 */
import { LeadProspectStatus, OutboundLeadStatus } from "@prisma/client";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { executeAuditPipeline } from "../lib/audit/execute-audit-pipeline";
import { parseAuditPayload } from "../lib/audit/types";
import { scoreWebsiteIdentity } from "../lib/audit/website-identity";
import { classifyRestaurant } from "../lib/lead-engine/restaurant-classifier";
import { prisma } from "../lib/db/prisma";
import { hostFromWebsiteUrl } from "../lib/outbound/chain-denylist";
import { buildOutboundAbDraft } from "../lib/outbound/email-templates-ab";
import { buildAuditPublicUrl } from "../lib/outbound/ensure-outbound-audit";
import {
  extractEmailsFromText,
  isGoodEmailCandidate,
  scoreRestaurantEmail,
} from "../lib/outbound/scrape-website-email";
import { isValidProspectEmail } from "../lib/outbound/validate-prospect-email";

const NON_FOOD_NAME =
  /\b(costcutter|keystore|off\s*licen[cs]e|newsagent|convenience|spar\b|premier\b(?!.*tandoori)|pharmacy|dentist|salon|barber|vape|smoke\s*mart|smokemart)\b/i;

const TARGET = Math.max(1, Number(process.env.OUTBOUND_ENSURE_TARGET || "100") || 100);

async function fetchHtml(url: string): Promise<{ html: string | null; status: number | null }> {
  try {
    const res = await fetch(url.startsWith("http") ? url : `https://${url}`, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KOB-Verify/1.0; +https://trykob.com)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { html: null, status: res.status };
    return { html: await res.text(), status: res.status };
  } catch {
    return { html: null, status: null };
  }
}

function emailLooksWrongForVenue(
  email: string,
  name: string,
  websiteUrl: string | null,
  pageEmails: string[],
): string | null {
  const valid = isValidProspectEmail(email, websiteUrl);
  if (!valid.ok) return `invalid_email:${valid.reason}`;
  if (!isGoodEmailCandidate(email)) return "blacklisted_email";

  const host = hostFromWebsiteUrl(websiteUrl);
  const [local, domain] = email.toLowerCase().split("@");
  if (!local || !domain) return "malformed_email";

  const BAD_CORP = new Set([
    "bestway.co.uk",
    "zpos.co.uk",
    "profiledigitalagency.co.uk",
    "maxproperty.co.uk",
  ]);
  if (BAD_CORP.has(domain)) return `agency_or_corp_email:${domain}`;

  if (pageEmails.length > 0 && host) {
    const onPage = pageEmails.some((e) => e.toLowerCase() === email.toLowerCase());
    const domainOnPage = pageEmails.some((e) => e.toLowerCase().endsWith(`@${domain}`));
    const siteDomain = host.replace(/^www\./, "");
    const emailOnSiteDomain =
      domain === siteDomain || domain.endsWith(`.${siteDomain}`) || siteDomain.endsWith(`.${domain}`);
    if (!onPage && !domainOnPage && !emailOnSiteDomain) {
      const nameClean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const gmailOk =
        ["gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.co.uk"].includes(
          domain,
        ) &&
        nameClean.length >= 4 &&
        local.includes(nameClean.slice(0, Math.min(6, nameClean.length)));
      if (!gmailOk) {
        const best = [...pageEmails]
          .filter(isGoodEmailCandidate)
          .sort(
            (a, b) =>
              scoreRestaurantEmail(b, name, siteDomain) - scoreRestaurantEmail(a, name, siteDomain),
          )[0];
        if (best && best !== email.toLowerCase()) {
          return `email_not_on_site_better=${best}`;
        }
        return "email_not_found_on_website";
      }
    }
  }

  return null;
}

async function verifyOne(lead: {
  restaurantName: string | null;
  city: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
}): Promise<{ ok: boolean; reasons: string[] }> {
  const name = lead.restaurantName?.trim() || "Unknown";
  const city = lead.city?.trim() || "";
  const email = lead.contactEmail?.trim() || null;
  const website = lead.websiteUrl?.trim() || null;
  const reasons: string[] = [];

  if (NON_FOOD_NAME.test(name)) reasons.push("name_not_restaurant");
  if (!website) return { ok: false, reasons: [...reasons, "no_website"] };
  if (!email) return { ok: false, reasons: [...reasons, "no_email"] };

  const page = await fetchHtml(website);
  const html = page.html;

  if (!html) {
    if (NON_FOOD_NAME.test(name)) reasons.push("name_not_restaurant");
    const emailBad = emailLooksWrongForVenue(email, name, website, []);
    if (emailBad) reasons.push(emailBad);
    if (page.status === 503 || page.status === 502) {
      const clf = classifyRestaurant({ name, categories: ["restaurant"], websiteText: "" });
      if (!clf.is_restaurant) reasons.push(`classifier:${clf.reason}`);
    } else {
      reasons.push(`website_unreachable:${page.status ?? "fetch_failed"}`);
    }
    return { ok: reasons.length === 0, reasons };
  }

  const identity = scoreWebsiteIdentity({
    restaurantName: name,
    city: city || "UK",
    url: website,
    html,
  });
  if (!identity.matched) reasons.push(`website_identity:${identity.reason}`);

  const clf = classifyRestaurant({
    name,
    categories: identity.hasHospitalityCue ? ["restaurant"] : null,
    websiteText: html.slice(0, 40_000),
    description: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null,
    hasDineIn: identity.hasHospitalityCue ? true : null,
  });
  if (!clf.is_restaurant) reasons.push(`classifier:${clf.reason}`);

  if (!identity.hasHospitalityCue && !clf.flags.includes("borderline_accepted")) {
    if (!clf.category_matched || clf.category_matched === "unknown_pending_categories") {
      reasons.push("no_hospitality_signals_on_website");
    }
  }

  const pageEmails = extractEmailsFromText(html);
  const emailBad = emailLooksWrongForVenue(email, name, website, pageEmails);
  if (emailBad) reasons.push(emailBad);

  return { ok: reasons.length === 0, reasons };
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

async function archiveFail(leadId: string, reasons: string[]) {
  await prisma.outboundLead.update({
    where: { id: leadId },
    data: {
      status: OutboundLeadStatus.ARCHIVED,
      insightSummary: `ARCHIVED verify: ${reasons.join(" | ")}`.slice(0, 500),
    },
  });
  await prisma.leadProspect.updateMany({
    where: { outboundLeadId: leadId },
    data: {
      status: LeadProspectStatus.ARCHIVED,
      disqualifiers: reasons.slice(0, 5),
      outboundLeadId: null,
    },
  });
}

async function ensureAuditReady(auditId: string, placeId?: string | null) {
  const audit = await prisma.visibilityAudit.findUnique({
    where: { id: auditId },
    select: {
      id: true,
      websiteUrl: true,
      restaurantName: true,
      resultPayload: true,
      slug: true,
    },
  });
  if (!audit?.websiteUrl) return { ok: false as const, reason: "no_website" };
  const payload = parseAuditPayload(audit.resultPayload);
  if (payload?.scanStatus === "ready") {
    return { ok: true as const, slug: audit.slug, alreadyReady: true };
  }

  console.log(`  running audit pipeline: ${audit.slug || audit.id}`);
  await executeAuditPipeline(audit.id, {
    websiteUrl: audit.websiteUrl,
    siteScope: "one",
    place: { name: audit.restaurantName, placeId: placeId ?? undefined },
  });

  const refreshed = await prisma.visibilityAudit.findUnique({
    where: { id: auditId },
    select: { slug: true, resultPayload: true },
  });
  const scan = parseAuditPayload(refreshed?.resultPayload)?.scanStatus;
  if (scan !== "ready") return { ok: false as const, reason: `scan_${scan ?? "unknown"}` };
  return { ok: true as const, slug: refreshed?.slug ?? audit.slug, alreadyReady: false };
}

async function httpCheckAuditUrl(url: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "KOB-audit-url-check/1.0" },
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

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
  if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID missing");

  mkdirSync("downloads/outbound", { recursive: true });

  let priorPassed: { name: string; city: string; email: string | null }[] = [];
  try {
    const prior = JSON.parse(readFileSync("downloads/outbound/verify-first-100.json", "utf8"));
    priorPassed = prior.passedList ?? [];
  } catch {
    /* start fresh */
  }

  const priorKeys = new Set(
    priorPassed.map((p) => `${p.name}|${(p.email || "").toLowerCase()}`),
  );

  // Resolve existing cohort lead rows
  const priorNames = [...new Set(priorPassed.map((p) => p.name))];
  const namedLeads =
    priorNames.length > 0
      ? await prisma.outboundLead.findMany({
          where: {
            workspaceRestaurantId: wid,
            status: OutboundLeadStatus.PENDING_APPROVAL,
            restaurantName: { in: priorNames },
          },
          select: {
            id: true,
            restaurantName: true,
            city: true,
            contactEmail: true,
            websiteUrl: true,
            auditUrl: true,
            visibilityAuditId: true,
            placeId: true,
            messageBody: true,
            messageSubject: true,
            emailVariant: true,
          },
        })
      : [];

  const existingLeads = namedLeads.filter((l) => {
    const key = `${l.restaurantName}|${(l.contactEmail || "").toLowerCase()}`;
    const nameOnly = priorPassed.some(
      (p) => p.name === l.restaurantName && (!p.email || !l.contactEmail || p.email.toLowerCase() === (l.contactEmail || "").toLowerCase()),
    );
    return priorKeys.has(key) || nameOnly;
  });

  const cohortIds = new Set(existingLeads.map((l) => l.id));
  console.log(`Prior verified still pending: ${existingLeads.length}/${priorPassed.length}`);

  // Top up with freshly verified leads until TARGET
  if (cohortIds.size < TARGET) {
    const need = TARGET - cohortIds.size;
    console.log(`Need ${need} more verified leads…`);

    const candidates = await prisma.outboundLead.findMany({
      where: {
        workspaceRestaurantId: wid,
        status: OutboundLeadStatus.PENDING_APPROVAL,
        id: { notIn: [...cohortIds] },
        contactEmail: { not: null },
        websiteUrl: { not: null },
        visibilityAuditId: { not: null },
      },
      orderBy: [{ createdAt: "asc" }, { restaurantName: "asc" }],
      take: Math.max(need * 4, 80),
      select: {
        id: true,
        restaurantName: true,
        city: true,
        contactEmail: true,
        websiteUrl: true,
        auditUrl: true,
        visibilityAuditId: true,
        placeId: true,
        messageBody: true,
        messageSubject: true,
        emailVariant: true,
      },
    });

    const verdicts = await mapPool(candidates, 6, async (lead, i) => {
      const key = `${lead.restaurantName}|${(lead.contactEmail || "").toLowerCase()}`;
      if (priorKeys.has(key)) return { lead, ok: true, reasons: [] as string[], skipped: true };
      const v = await verifyOne(lead);
      const mark = v.ok ? "PASS" : "FAIL";
      console.log(`  topup ${String(i + 1).padStart(3)}. ${mark}  ${lead.restaurantName} — ${lead.city}`);
      if (!v.ok) console.log(`       → ${v.reasons.join("; ")}`);
      return { lead, ...v, skipped: false };
    });

    for (const v of verdicts) {
      if (v.skipped) continue;
      if (!v.ok) {
        await archiveFail(v.lead.id, v.reasons);
        continue;
      }
      if (cohortIds.size >= TARGET) continue;
      cohortIds.add(v.lead.id);
      existingLeads.push(v.lead);
      priorPassed.push({
        name: v.lead.restaurantName!,
        city: v.lead.city || "",
        email: v.lead.contactEmail,
      });
      priorKeys.add(`${v.lead.restaurantName}|${(v.lead.contactEmail || "").toLowerCase()}`);
    }
  }

  const cohort = existingLeads.filter((l) => cohortIds.has(l.id)).slice(0, TARGET);
  console.log(`\nEnsuring audits + URLs for ${cohort.length} leads…`);

  const results: {
    name: string;
    email: string | null;
    auditUrl: string;
    auditReady: boolean;
    urlHttpOk: boolean;
    emailRewritten: boolean;
    issues: string[];
  }[] = [];

  for (let i = 0; i < cohort.length; i++) {
    const lead = cohort[i]!;
    const issues: string[] = [];
    console.log(`${String(i + 1).padStart(3)}. ${lead.restaurantName}`);

    if (!lead.visibilityAuditId) {
      issues.push("no_audit_id");
      results.push({
        name: lead.restaurantName!,
        email: lead.contactEmail,
        auditUrl: lead.auditUrl || "",
        auditReady: false,
        urlHttpOk: false,
        emailRewritten: false,
        issues,
      });
      continue;
    }

    const ready = await ensureAuditReady(lead.visibilityAuditId, lead.placeId);
    if (!ready.ok) {
      issues.push(ready.reason);
      results.push({
        name: lead.restaurantName!,
        email: lead.contactEmail,
        auditUrl: lead.auditUrl || "",
        auditReady: false,
        urlHttpOk: false,
        emailRewritten: false,
        issues,
      });
      continue;
    }

    const audit = await prisma.visibilityAudit.findUnique({
      where: { id: lead.visibilityAuditId },
      select: { id: true, slug: true },
    });
    const pathKey = audit?.slug || lead.visibilityAuditId;
    const auditUrl = buildAuditPublicUrl(pathKey, lead.contactEmail);

    let emailRewritten = false;
    const bodyHasPath = Boolean(lead.messageBody?.includes(pathKey));
    const urlMatches = lead.auditUrl === auditUrl;

    if (!urlMatches || !bodyHasPath || !lead.messageBody?.trim()) {
      const draft = buildOutboundAbDraft({
        stableId: lead.id,
        companyName: lead.restaurantName || "your restaurant",
        auditUrl,
        variant: lead.emailVariant ?? undefined,
      });
      await prisma.outboundLead.update({
        where: { id: lead.id },
        data: {
          auditUrl,
          messageSubject: draft.email_subject,
          messageBody: draft.message_body,
          emailVariant: draft.variant,
          suggestedTone: draft.suggested_tone,
        },
      });
      emailRewritten = true;
    } else if (!urlMatches) {
      await prisma.outboundLead.update({
        where: { id: lead.id },
        data: { auditUrl },
      });
      emailRewritten = true;
    }

    const http = await httpCheckAuditUrl(auditUrl);
    if (!http.ok) issues.push(`http_${http.status}${http.error ? `:${http.error}` : ""}`);

    results.push({
      name: lead.restaurantName!,
      email: lead.contactEmail,
      auditUrl,
      auditReady: true,
      urlHttpOk: http.ok,
      emailRewritten,
      issues,
    });
  }

  const readyCount = results.filter((r) => r.auditReady).length;
  const httpOk = results.filter((r) => r.urlHttpOk).length;
  const rewritten = results.filter((r) => r.emailRewritten).length;
  const broken = results.filter((r) => !r.auditReady || !r.urlHttpOk);

  const report = {
    target: TARGET,
    cohortSize: cohort.length,
    auditReady: readyCount,
    urlHttpOk: httpOk,
    emailsRewritten: rewritten,
    broken,
    passedList: results
      .filter((r) => r.auditReady && r.urlHttpOk)
      .map((r) => ({ name: r.name, city: "", email: r.email, auditUrl: r.auditUrl })),
    all: results,
  };

  writeFileSync("downloads/outbound/ensure-100-audits.json", JSON.stringify(report, null, 2));
  writeFileSync(
    "downloads/outbound/verify-first-100.json",
    JSON.stringify(
      {
        checked: cohort.length,
        passCount: report.passedList.length,
        failCount: broken.length,
        archived: 0,
        failures: broken,
        passedList: report.passedList.map((p, n) => ({
          n: n + 1,
          name: p.name,
          city: p.city,
          email: p.email,
        })),
      },
      null,
      2,
    ),
  );

  const md = [
    `# Verified send list (${report.passedList.length})`,
    "",
    ...report.passedList.map(
      (p, i) => `${i + 1}. **${p.name}** — ${p.email ?? "—"} — ${p.auditUrl}`,
    ),
    "",
  ].join("\n");
  writeFileSync("downloads/outbound/verified-send-list.md", md);

  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        cohort: cohort.length,
        auditReady: readyCount,
        urlHttpOk: httpOk,
        emailsRewritten: rewritten,
        broken: broken.length,
      },
      null,
      2,
    ),
  );
  if (broken.length) {
    console.log("Broken:");
    for (const b of broken) console.log(`  - ${b.name}: ${b.issues.join("; ")}`);
  }
  console.log("Report: downloads/outbound/ensure-100-audits.json");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
