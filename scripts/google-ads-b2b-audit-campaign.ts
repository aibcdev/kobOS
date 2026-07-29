/**
 * Generate KOB B2B Google Ads (audit) campaign pack → downloads/outbound/
 *
 *   npm run ads:b2b-audit
 *   npm run ads:b2b-audit -- --budget=40 --locations="United Kingdom,Ireland"
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import {
  b2bAuditPlanToEditorCsv,
  b2bAuditPlanToMarkdown,
  buildB2bAuditAdsPlan,
} from "@/lib/marketing/google-ads-b2b-audit";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const budgetRaw = arg("budget");
  const locationsRaw = arg("locations");
  const plan = buildB2bAuditAdsPlan({
    dailyBudgetGbp: budgetRaw ? Number(budgetRaw) : 10,
    locations: locationsRaw
      ? locationsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : ["United Kingdom", "Ireland", "Australia"],
  });

  const dir = join(process.cwd(), "downloads", "outbound");
  mkdirSync(dir, { recursive: true });
  const stamp = plan.createdAt.replace(/[:.]/g, "-").slice(0, 19);
  const base = `google-ads-b2b-audit-${stamp}`;

  const jsonPath = join(dir, `${base}.json`);
  const mdPath = join(dir, `${base}.md`);
  const csvPath = join(dir, `${base}.csv`);

  writeFileSync(jsonPath, JSON.stringify(plan, null, 2));
  writeFileSync(mdPath, b2bAuditPlanToMarkdown(plan));
  writeFileSync(csvPath, b2bAuditPlanToEditorCsv(plan));

  console.log("=== KOB B2B Audit Google Ads ===");
  console.log(JSON.stringify({
    campaign: plan.campaignName,
    keywords: plan.keywords.length,
    adGroups: plan.adGroups.length,
    dailyBudgetGbp: plan.dailyBudgetGbp,
    finalUrl: plan.finalUrl,
    locations: plan.locations,
  }, null, 2));
  console.log("wrote", jsonPath);
  console.log("wrote", mdPath);
  console.log("wrote", csvPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
