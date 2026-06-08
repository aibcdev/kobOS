#!/usr/bin/env node
/** Enrich batch JSON with issues/opportunities from DB. */
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const batchPath = process.argv[2];
if (!batchPath) {
  console.error("Usage: node scripts/audit-batch-enrich.mjs <batch.json>");
  process.exit(1);
}

const batch = JSON.parse(readFileSync(batchPath, "utf8"));
const prisma = new PrismaClient();

function parsePayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  return raw;
}

const enriched = [];
for (const r of batch.results) {
  if (r.error) {
    enriched.push(r);
    continue;
  }
  const audit = await prisma.visibilityAudit.findUnique({ where: { id: r.id } });
  if (!audit) {
    enriched.push({ ...r, dbError: "not found" });
    continue;
  }
  const payload = parsePayload(audit.resultPayload);
  enriched.push({
    ...r,
    restaurantName: audit.restaurantName,
    city: audit.city,
    issues: payload?.issues?.map((i) => ({ title: i.title, impact: i.impact })) ?? [],
    opportunities: payload?.opportunities?.map((o) => o.title) ?? [],
    teaser: payload?.teaser ?? null,
    scanStatus: payload?.scanStatus,
    fetched: payload?.evidencePack?.pageEvidence?.[0]?.fetchOk ?? null,
    signals: payload?.evidencePack?.signalsSummary ?? null,
    benchmarkV1: payload?.benchmarkV1
      ? {
          seo: payload.benchmarkV1.seo?.score,
          web: payload.benchmarkV1.websiteExperience?.score,
          overallSummary: payload.benchmarkV1.overallSummary?.slice(0, 300),
          seoGaps: payload.benchmarkV1.seo?.topGaps?.slice(0, 3),
          webGaps: payload.benchmarkV1.websiteExperience?.topGaps?.slice(0, 3),
        }
      : null,
    competitorCount: payload?.competitors?.length ?? 0,
    competitorSources: [...new Set((payload?.competitors ?? []).map((c) => c.source))],
    competitorNames: (payload?.competitors ?? []).slice(0, 5).map((c) => c.name),
  });
}

await prisma.$disconnect();
const outPath = batchPath.replace(".json", "-enriched.json");
writeFileSync(outPath, JSON.stringify({ ...batch, results: enriched }, null, 2));
console.log(outPath);
for (const r of enriched) {
  if (r.error) continue;
  console.log(`\n${r.restaurantName || r.name} (${r.city}) — ${r.overallScore}`);
  console.log(`  issues: ${(r.issues ?? []).map((i) => i.title).join(" | ") || "none"}`);
  if (r.benchmarkV1?.overallSummary) console.log(`  AI: ${r.benchmarkV1.overallSummary.slice(0, 120)}…`);
}
