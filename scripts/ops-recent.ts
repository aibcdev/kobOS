/**
 * Visits, audits by origin, sign-ups and trials over the last N hours. Read-only.
 * Usage: npm run ops:recent -- [--hours 48]
 */
import { prisma } from "../lib/db/prisma";
import { loadRecentActivity } from "../lib/ops/recent-activity";

const i = process.argv.indexOf("--hours");
const hours = i >= 0 ? Number(process.argv[i + 1]) : 48;

async function main() {
  const a = await loadRecentActivity(hours);
  console.log(`Last ${a.hours}h (since ${a.since})\n`);
  console.log(`Visits (since ${a.visitsSinceDay} UTC): ${a.visits.views} page views, ${a.visits.entries} visits started`);
  for (const s of a.visits.topSources) console.log(`  ${String(s.entries).padStart(5)}  from ${s.source}`);
  for (const p of a.visits.topPages) console.log(`  ${String(p.views).padStart(5)}  views of ${p.path}`);
  console.log(
    `\nAudits: ${a.audits.visitor} by visitors, ${a.audits.outbound} outbound (KOB prospecting), ${a.audits.internal} internal, ${a.audits.unknown} unknown`,
  );
  console.log(`Emails left on an audit: ${a.auditEmails}`);
  console.log(`New accounts: ${a.newAccounts}`);
  console.log(`Trials started: ${a.trialsStarted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
