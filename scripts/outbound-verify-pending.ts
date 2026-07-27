/**
 * Final 1-by-1 gate for the first N PENDING leads.
 * Pass = restaurant/fast-food (classifier + website identity) AND plausible email.
 * Failures are archived with reasons.
 *
 *   OUTBOUND_VERIFY_LIMIT=100 npm run outbound:verify-pending
 */
import { LeadProspectStatus, OutboundLeadStatus } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import { scoreWebsiteIdentity } from "../lib/audit/website-identity";
import { classifyRestaurant } from "../lib/lead-engine/restaurant-classifier";
import { prisma } from "../lib/db/prisma";
import { hostFromWebsiteUrl } from "../lib/outbound/chain-denylist";
import { isValidProspectEmail } from "../lib/outbound/validate-prospect-email";
import {
  extractEmailsFromText,
  isGoodEmailCandidate,
  scoreRestaurantEmail,
} from "../lib/outbound/scrape-website-email";

const NON_FOOD_NAME =
  /\b(costcutter|keystore|off\s*licen[cs]e|newsagent|convenience|spar\b|premier\b(?!.*tandoori)|pharmacy|dentist|salon|barber|vape|smoke\s*mart|smokemart)\b/i;

type Verdict = {
  n: number;
  name: string;
  city: string;
  email: string | null;
  website: string | null;
  ok: boolean;
  reasons: string[];
};

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

  // Generic corporate domains that aren't the restaurant
  const BAD_CORP = new Set([
    "bestway.co.uk",
    "zpos.co.uk",
    "profiledigitalagency.co.uk",
    "maxproperty.co.uk",
  ]);
  if (BAD_CORP.has(domain)) return `agency_or_corp_email:${domain}`;

  // If page lists emails and ours isn't among top-scoring page emails, warn
  if (pageEmails.length > 0 && host) {
    const onPage = pageEmails.some((e) => e.toLowerCase() === email.toLowerCase());
    const domainOnPage = pageEmails.some((e) => e.toLowerCase().endsWith(`@${domain}`));
    const siteDomain = host.replace(/^www\./, "");
    const emailOnSiteDomain =
      domain === siteDomain || domain.endsWith(`.${siteDomain}`) || siteDomain.endsWith(`.${domain}`);
    if (!onPage && !domainOnPage && !emailOnSiteDomain) {
      // Gmail with business-name token is OK (owner confirmed pattern)
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

async function verifyOne(
  n: number,
  lead: {
    id: string;
    restaurantName: string | null;
    city: string | null;
    contactEmail: string | null;
    websiteUrl: string | null;
  },
): Promise<Verdict> {
  const name = lead.restaurantName?.trim() || "Unknown";
  const city = lead.city?.trim() || "";
  const email = lead.contactEmail?.trim() || null;
  const website = lead.websiteUrl?.trim() || null;
  const reasons: string[] = [];

  if (NON_FOOD_NAME.test(name)) {
    reasons.push("name_not_restaurant");
  }

  if (!website) {
    reasons.push("no_website");
    return { n, name, city, email, website, ok: false, reasons };
  }
  if (!email) {
    reasons.push("no_email");
    return { n, name, city, email, website, ok: false, reasons };
  }

  const page = await fetchHtml(website);
  const html = page.html;

  if (!html) {
    // Site down — still reject obvious non-food names; keep if name looks food and email valid
    if (NON_FOOD_NAME.test(name)) reasons.push("name_not_restaurant");
    const emailBad = emailLooksWrongForVenue(email, name, website, []);
    if (emailBad) reasons.push(emailBad);
    if (page.status === 503 || page.status === 502) {
      // Can't prove restaurant from site — require classifier on name only
      const clf = classifyRestaurant({ name, categories: ["restaurant"], websiteText: "" });
      if (!clf.is_restaurant) reasons.push(`classifier:${clf.reason}`);
    } else {
      reasons.push(`website_unreachable:${page.status ?? "fetch_failed"}`);
    }
    return { n, name, city, email, website, ok: reasons.length === 0, reasons };
  }

  const identity = scoreWebsiteIdentity({
    restaurantName: name,
    city: city || "UK",
    url: website,
    html,
  });
  if (!identity.matched) {
    reasons.push(`website_identity:${identity.reason}`);
  }

  const clf = classifyRestaurant({
    name,
    categories: identity.hasHospitalityCue ? ["restaurant"] : null,
    websiteText: html.slice(0, 40_000),
    description: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null,
    hasDineIn: identity.hasHospitalityCue ? true : null,
  });
  if (!clf.is_restaurant) {
    reasons.push(`classifier:${clf.reason}`);
  }

  // Must look like food business — hospitality cues OR accept category match
  if (!identity.hasHospitalityCue && !clf.flags.includes("borderline_accepted")) {
    // Fast food / takeaway still OK if classifier passed with restaurant category
    if (!clf.category_matched || clf.category_matched === "unknown_pending_categories") {
      reasons.push("no_hospitality_signals_on_website");
    }
  }

  const pageEmails = extractEmailsFromText(html);
  const emailBad = emailLooksWrongForVenue(email, name, website, pageEmails);
  if (emailBad) reasons.push(emailBad);

  return { n, name, city, email, website, ok: reasons.length === 0, reasons };
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
  const limit = Math.max(1, Number(process.env.OUTBOUND_VERIFY_LIMIT || "100") || 100);
  const apply = process.env.OUTBOUND_VERIFY_APPLY !== "0"; // default archive fails

  const leads = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
    orderBy: [{ createdAt: "asc" }, { restaurantName: "asc" }],
    take: limit,
    select: {
      id: true,
      restaurantName: true,
      city: true,
      contactEmail: true,
      websiteUrl: true,
    },
  });

  console.log(`Verifying ${leads.length} leads (apply=${apply})…`);

  const verdicts = await mapPool(leads, 6, async (lead, i) => {
    const v = await verifyOne(i + 1, lead);
    const mark = v.ok ? "PASS" : "FAIL";
    console.log(`${String(v.n).padStart(3)}. ${mark}  ${v.name} — ${v.city} · ${v.email ?? "—"}`);
    if (!v.ok) console.log(`      → ${v.reasons.join("; ")}`);
    return { leadId: lead.id, ...v };
  });

  const pass = verdicts.filter((v) => v.ok);
  const fail = verdicts.filter((v) => !v.ok);

  if (apply && fail.length) {
    for (const f of fail) {
      await prisma.outboundLead.update({
        where: { id: f.leadId },
        data: {
          status: OutboundLeadStatus.ARCHIVED,
          insightSummary: `ARCHIVED verify: ${f.reasons.join(" | ")}`.slice(0, 500),
        },
      });
      await prisma.leadProspect.updateMany({
        where: { outboundLeadId: f.leadId },
        data: {
          status: LeadProspectStatus.ARCHIVED,
          disqualifiers: f.reasons.slice(0, 5),
          outboundLeadId: null,
        },
      });
    }
  }

  mkdirSync("downloads/outbound", { recursive: true });
  const report = {
    checked: verdicts.length,
    passCount: pass.length,
    failCount: fail.length,
    archived: apply ? fail.length : 0,
    failures: fail.map((f) => ({
      n: f.n,
      name: f.name,
      city: f.city,
      email: f.email,
      website: f.website,
      reasons: f.reasons,
    })),
    passedList: pass.map((p) => ({ n: p.n, name: p.name, city: p.city, email: p.email })),
  };
  writeFileSync("downloads/outbound/verify-first-100.json", JSON.stringify(report, null, 2));

  const pending = await prisma.outboundLead.count({
    where: { workspaceRestaurantId: wid, status: "PENDING_APPROVAL" },
  });

  console.log("\n=== SUMMARY ===");
  console.log(
    JSON.stringify(
      { checked: report.checked, passed: report.passCount, failed: report.failCount, pending },
      null,
      2,
    ),
  );
  console.log("Report: downloads/outbound/verify-first-100.json");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
