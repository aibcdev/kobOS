import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { prisma } from "../lib/db/prisma";

async function main() {
  const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID!;
  const sent = await prisma.outboundLead.findMany({
    where: { workspaceRestaurantId: wid, status: "SENT" },
    orderBy: [{ emailVariant: "asc" }, { restaurantName: "asc" }],
    select: {
      restaurantName: true,
      city: true,
      contactEmail: true,
      emailVariant: true,
      messageSubject: true,
      auditUrl: true,
      websiteUrl: true,
      insightSummary: true,
    },
  });

  const schedule = existsSync("downloads/outbound/schedule-result.json")
    ? JSON.parse(readFileSync("downloads/outbound/schedule-result.json", "utf8"))
    : null;

  const cities = new Map<string, number>();
  for (const s of sent) {
    const c = s.city || "unknown";
    cities.set(c, (cities.get(c) || 0) + 1);
  }
  const topCities = [...cities.entries()].sort((a, b) => b[1] - a[1]);

  const a = sent.filter((s) => s.emailVariant === "A");
  const b = sent.filter((s) => s.emailVariant === "B");

  mkdirSync("downloads/outbound", { recursive: true });

  const md = [
    `# Outbound sent batch — 25 Jul 2026`,
    ``,
    `Scheduled delivery: **07:00 BST** (\`${schedule?.scheduledAt ?? "2026-07-25T06:00:00.000Z"}\`)`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|---|---:|`,
    `| Total queued/sent | ${sent.length} |`,
    `| Variant A | ${a.length} |`,
    `| Variant B | ${b.length} |`,
    `| With email | ${sent.filter((s) => s.contactEmail).length} |`,
    `| With audit URL | ${sent.filter((s) => s.auditUrl).length} |`,
    `| Schedule API failures | ${schedule?.failed ?? "—"} |`,
    ``,
    `**From:** KOB <hello@trykob.com>`,
    ``,
    `**Subjects**`,
    `- A: \`We found something on {Name}'s website\``,
    `- B: \`{Name}\` (restaurant name only)`,
    ``,
    `## Top cities`,
    ``,
    ...topCities.slice(0, 20).map(([c, n]) => `- ${c}: ${n}`),
    ``,
    `## Variant A (${a.length})`,
    ``,
    `| # | Restaurant | City | Email | Audit |`,
    `|---:|---|---|---|---|`,
    ...a.map(
      (s, i) =>
        `| ${i + 1} | ${s.restaurantName} | ${s.city ?? ""} | ${s.contactEmail ?? ""} | ${s.auditUrl ?? ""} |`,
    ),
    ``,
    `## Variant B (${b.length})`,
    ``,
    `| # | Restaurant | City | Email | Audit |`,
    `|---:|---|---|---|---|`,
    ...b.map(
      (s, i) =>
        `| ${i + 1} | ${s.restaurantName} | ${s.city ?? ""} | ${s.contactEmail ?? ""} | ${s.auditUrl ?? ""} |`,
    ),
    ``,
  ].join("\n");

  writeFileSync("downloads/outbound/sent-batch-report.md", md);
  writeFileSync(
    "downloads/outbound/sent-batch-report.json",
    JSON.stringify(
      {
        scheduledAt: schedule?.scheduledAt,
        total: sent.length,
        a: a.length,
        b: b.length,
        topCities: topCities.slice(0, 20),
        leads: sent,
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        total: sent.length,
        a: a.length,
        b: b.length,
        scheduledAt: schedule?.scheduledAt,
        failed: schedule?.failed,
        topCities: topCities.slice(0, 10),
        report: "downloads/outbound/sent-batch-report.md",
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
