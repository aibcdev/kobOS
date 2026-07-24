import {
  computeAuditOpportunityReport,
  ensureMoneyFirstOpportunityReport,
} from "@/lib/audit/audit-opportunity-from-payload";
import { parseAuditPayload, type AuditResultPayload } from "@/lib/audit/types";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type ShareHtmlInput = {
  id: string;
  slug: string | null;
  restaurantName: string;
  city: string;
  websiteUrl: string | null;
  overallScore: number;
  seoScore: number;
  designScore: number;
  mobileScore: number;
  conversionScore: number;
  resultPayload: unknown;
};

/**
 * Static HTML document (no React / RSC / JS). Readable by any browser or review tool.
 */
export function renderAuditShareHtml(input: ShareHtmlInput): string | null {
  const payload = parseAuditPayload(input.resultPayload);
  if (!payload) return null;

  const opportunity = ensureMoneyFirstOpportunityReport(
    payload.opportunityReport ??
      computeAuditOpportunityReport(payload, {
        name: input.restaurantName,
        city: input.city,
        websiteUrl: input.websiteUrl,
      }),
    payload,
  );

  const pathKey = input.slug || input.id;
  const interactiveUrl = `https://trykob.com/audit/${pathKey}`;
  const growthScore = opportunity.growthScore ?? input.overallScore;
  const lostCustomers = opportunity.opportunity_score?.est_monthly_lost_customers ?? 0;
  const peerBottom = opportunity.peerPercentileBottom ?? Math.max(5, 100 - growthScore);
  const projected = opportunity.projectedGrowthScore ?? Math.min(95, growthScore + 12);
  const wins = opportunity.topFixes.slice(0, 5);
  const nearby = opportunity.nearbyComparison ?? [];
  const issues = payload.issues ?? [];
  const rs = payload.restaurantScores;
  const website = input.websiteUrl?.replace(/^https?:\/\//, "") ?? "";

  const winsHtml = wins
    .map(
      (w, i) => `
      <li>
        <p><strong>${i + 1}. ${esc(w.title)}</strong></p>
        <p>${esc(w.detail)}</p>
        <p>+${w.customersPerMonth.toLocaleString("en-GB")} customers / month</p>
      </li>`,
    )
    .join("");

  const nearbyHtml =
    nearby.length === 0
      ? "<p>No nearby comparison rows in this scan.</p>"
      : `<table>
        <thead><tr><th>Signal</th><th>You</th><th>Nearby</th></tr></thead>
        <tbody>
          ${nearby
            .map(
              (r) =>
                `<tr><td>${esc(r.label)}</td><td>${esc(String(r.you))}</td><td>${esc(String(r.nearby))}</td></tr>`,
            )
            .join("")}
        </tbody>
      </table>`;

  const issuesHtml =
    issues.length === 0
      ? "<p>No issues listed.</p>"
      : `<ul>${issues
          .map(
            (iss) =>
              `<li><strong>${esc(iss.title)}</strong> (${esc(iss.impact)})${
                iss.fixHint ? ` — ${esc(iss.fixHint)}` : ""
              }</li>`,
          )
          .join("")}</ul>`;

  const opportunitiesHtml =
    (payload.opportunities?.length ?? 0) === 0
      ? ""
      : `<h2>Opportunities</h2>
        <ul>${payload.opportunities
          .map(
            (o) =>
              `<li><strong>${esc(o.title)}</strong> — ${esc(o.impactEstimate)}</li>`,
          )
          .join("")}</ul>`;

  const roadmap = payload.gated?.roadmap;
  const roadmapHtml = roadmap
    ? `<h2>30 / 60 / 90 roadmap</h2>
      <h3>30 days</h3><ul>${roadmap.days30.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3>60 days</h3><ul>${roadmap.days60.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3>90 days</h3><ul>${roadmap.days90.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
    : "";

  const axisHtml = rs
    ? `<p>Grade ${esc(rs.grade)} · Reviews ${rs.reviews} · GBP ${rs.gbp} · Website ${rs.website} · Competitive ${rs.competitors} · Technical ${rs.technical}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="index,follow" />
  <title>${esc(input.restaurantName)} — KOB Opportunity Report (share)</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; line-height: 1.5; color: #1a1a1a; background: #f9f3ed; margin: 0; }
    main { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; background: #fff; }
    h1 { font-size: 1.75rem; margin: 0 0 0.25rem; }
    h2 { font-size: 1.25rem; margin: 2rem 0 0.75rem; border-top: 1px solid #e5e5e5; padding-top: 1.25rem; }
    h3 { font-size: 1rem; margin: 1rem 0 0.5rem; }
    p, li { font-size: 1rem; }
    .muted { color: #5c5c5c; }
    .banner { background: #094413; color: #fff; padding: 0.75rem 1.25rem; font-family: system-ui, sans-serif; font-size: 0.9rem; }
    .banner a { color: #fff; }
    .score { font-size: 2rem; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
    th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid #e5e5e5; font-size: 0.95rem; }
    ul { padding-left: 1.25rem; }
    a { color: #094413; }
  </style>
</head>
<body>
  <div class="banner">
    KOB share view — no login, no JavaScript required.
    Interactive UI: <a href="${esc(interactiveUrl)}">${esc(interactiveUrl)}</a>
  </div>
  <main>
    <p class="muted">Opportunity Report · Prepared for the owner · Public</p>
    <h1>${esc(input.restaurantName)}</h1>
    <p class="muted">${esc(input.city)}${website ? ` · ${esc(website)}` : ""}</p>

    <h2>Restaurant Growth Score</h2>
    <p class="score">${growthScore}<span class="muted"> / 100</span></p>
    <p>Bottom ${peerBottom}% vs similar restaurants</p>
    <p><strong>Customers lost / month:</strong> ~${lostCustomers.toLocaleString("en-GB")}</p>
    ${axisHtml}

    <h2>Biggest wins</h2>
    <ol>${winsHtml || "<li>No wins listed for this scan.</li>"}</ol>

    <h2>Nearby comparison</h2>
    ${nearbyHtml}

    <h2>Score trajectory</h2>
    <p>Today <strong>${growthScore}</strong> → next month ~<strong>${projected}</strong> if the wins above are fixed.</p>

    <h2>Issues found</h2>
    ${issuesHtml}

    ${opportunitiesHtml}
    ${roadmapHtml}

    <h2>Next step</h2>
    <p>
      <a href="https://trykob.com/signup">Start free trial</a>
      ·
      <a href="https://trykob.com/demo">Book a 12-minute walkthrough</a>
      ·
      <a href="${esc(interactiveUrl)}">Open interactive report</a>
    </p>
  </main>
</body>
</html>`;
}

/** Re-export type guard helper for callers that already have a payload. */
export function renderAuditShareHtmlFromPayload(
  meta: Omit<ShareHtmlInput, "resultPayload"> & { payload: AuditResultPayload },
): string {
  const html = renderAuditShareHtml({
    ...meta,
    resultPayload: meta.payload,
  });
  if (!html) {
    return `<!DOCTYPE html><html><body><p>Invalid audit payload.</p></body></html>`;
  }
  return html;
}

/**
 * Plain-text Opportunity Report — for AI/review tools that cannot render HTML.
 */
export function renderAuditShareMarkdown(input: ShareHtmlInput): string | null {
  const payload = parseAuditPayload(input.resultPayload);
  if (!payload) return null;

  const opportunity = ensureMoneyFirstOpportunityReport(
    payload.opportunityReport ??
      computeAuditOpportunityReport(payload, {
        name: input.restaurantName,
        city: input.city,
        websiteUrl: input.websiteUrl,
      }),
    payload,
  );

  const pathKey = input.slug || input.id;
  const growthScore = opportunity.growthScore ?? input.overallScore;
  const lostCustomers = opportunity.opportunity_score?.est_monthly_lost_customers ?? 0;
  const peerBottom = opportunity.peerPercentileBottom ?? Math.max(5, 100 - growthScore);
  const projected = opportunity.projectedGrowthScore ?? Math.min(95, growthScore + 12);
  const wins = opportunity.topFixes.slice(0, 5);
  const nearby = opportunity.nearbyComparison ?? [];
  const issues = payload.issues ?? [];
  const rs = payload.restaurantScores;
  const website = input.websiteUrl ?? "";

  const lines: string[] = [
    `KOB OPPORTUNITY REPORT (plain text — no login required)`,
    `=======================================================`,
    ``,
    `Restaurant: ${input.restaurantName}`,
    `City: ${input.city}`,
    website ? `Website: ${website}` : null,
    `Interactive UI: https://trykob.com/audit/${pathKey}`,
    `Static HTML: https://trykob.com/audit/${pathKey}/share`,
    ``,
    `RESTAURANT GROWTH SCORE`,
    `----------------------`,
    `Score: ${growthScore} / 100`,
    `Bottom ${peerBottom}% vs similar restaurants`,
    `Customers lost / month: ~${lostCustomers}`,
    rs
      ? `Axes: Grade ${rs.grade} | Reviews ${rs.reviews} | GBP ${rs.gbp} | Website ${rs.website} | Competitive ${rs.competitors} | Technical ${rs.technical}`
      : null,
    ``,
    `BIGGEST WINS`,
    `------------`,
  ].filter((x): x is string => x != null);

  if (wins.length === 0) {
    lines.push(`(none listed)`);
  } else {
    wins.forEach((w, i) => {
      lines.push(`${i + 1}. ${w.title}`);
      lines.push(`   ${w.detail}`);
      lines.push(`   +${w.customersPerMonth} customers / month`);
      lines.push(``);
    });
  }

  lines.push(`NEARBY COMPARISON`, `-----------------`);
  if (nearby.length === 0) {
    lines.push(`(no nearby rows in this scan)`);
  } else {
    nearby.forEach((r) => lines.push(`${r.label}: you=${r.you} | nearby=${r.nearby}`));
  }

  lines.push(``, `SCORE TRAJECTORY`, `----------------`, `Today ${growthScore} → next month ~${projected}`);

  lines.push(``, `ISSUES FOUND`, `------------`);
  if (issues.length === 0) {
    lines.push(`(none)`);
  } else {
    issues.forEach((iss) => {
      lines.push(`- ${iss.title} (${iss.impact})${iss.fixHint ? ` — ${iss.fixHint}` : ""}`);
    });
  }

  if (payload.opportunities?.length) {
    lines.push(``, `OPPORTUNITIES`, `-------------`);
    payload.opportunities.forEach((o) => lines.push(`- ${o.title}: ${o.impactEstimate}`));
  }

  const roadmap = payload.gated?.roadmap;
  if (roadmap) {
    lines.push(``, `30 / 60 / 90 ROADMAP`, `-------------------`);
    lines.push(`30 days:`);
    roadmap.days30.forEach((x) => lines.push(`  - ${x}`));
    lines.push(`60 days:`);
    roadmap.days60.forEach((x) => lines.push(`  - ${x}`));
    lines.push(`90 days:`);
    roadmap.days90.forEach((x) => lines.push(`  - ${x}`));
  }

  lines.push(
    ``,
    `NEXT STEP`,
    `---------`,
    `Start free trial: https://trykob.com/signup`,
    `Book walkthrough: https://trykob.com/demo`,
  );

  return lines.join("\n");
}

