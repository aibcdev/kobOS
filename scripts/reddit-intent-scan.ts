/**
 * Scan restaurant subreddits for buying-intent posts (recommendations / alternatives / burned-by).
 *
 * Usage:
 *   npm run outbound:reddit-intent
 *   REDDIT_INTENT_SUBREDDITS=restaurant,restaurantowners REDDIT_INTENT_MAX_AGE_HOURS=72 npm run outbound:reddit-intent
 *   REDDIT_INTENT_PERSIST=1 npm run outbound:reddit-intent   # queue DRAFT outbound leads (manual approve)
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { OutboundLeadSource, OutboundLeadStatus } from "@prisma/client";

import { prisma } from "../lib/db/prisma";
import { draftRedditIntentEmail, runRedditIntentScan } from "../lib/reddit-intent/search";

async function persistHits(
  workspaceId: string,
  hits: Awaited<ReturnType<typeof runRedditIntentScan>>["hits"],
) {
  let inserted = 0;
  let skipped = 0;
  for (const hit of hits) {
    const placeId = `reddit:${hit.id}`;
    const existing = await prisma.outboundLead.findFirst({
      where: { workspaceRestaurantId: workspaceId, placeId },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    const draft = draftRedditIntentEmail(hit);
    await prisma.outboundLead.create({
      data: {
        workspaceRestaurantId: workspaceId,
        placeId,
        city: hit.subreddit,
        restaurantName: `u/${hit.author}`,
        websiteUrl: hit.permalink,
        contactEmail: null,
        insightSummary: [
          `Reddit intent · ${hit.subreddit}`,
          `Age: ${hit.ageHours}h · intent ${hit.intentScore}`,
          `Query: ${hit.matchedQuery}`,
          `Title: ${hit.title}`,
          hit.selftext.slice(0, 500),
        ].join("\n"),
        messageSubject: draft.subject,
        messageBody: draft.body,
        suggestedTone: "reddit_intent",
        status: OutboundLeadStatus.DRAFT,
        source: OutboundLeadSource.MANUAL,
        enrichmentSource: "reddit_intent",
        qualifyScore: hit.intentScore,
      },
    });
    inserted += 1;
  }
  return { inserted, skipped };
}

async function main() {
  const focusSubs = process.env.REDDIT_INTENT_SUBREDDITS?.trim()
    ? undefined
    : ["restaurant", "restaurantowners"];

  console.log("=== Reddit intent scan (KOB) ===");
  const result = await runRedditIntentScan({
    subreddits: focusSubs,
    maxQueriesPerSub: Number(process.env.REDDIT_INTENT_MAX_QUERIES?.trim() || "10") || 10,
    includeNewFeed: true,
  });

  console.log(
    JSON.stringify(
      {
        scannedAt: result.scannedAt,
        subreddits: result.config.subreddits,
        maxAgeHours: result.config.maxAgeHours,
        queriesRun: result.queriesRun,
        hits: result.hits.length,
        errors: result.errors.length,
      },
      null,
      2,
    ),
  );

  if (result.errors.length) {
    console.log("errors (sample):", result.errors.slice(0, 5));
  }

  const outDir = join(process.cwd(), "downloads", "outbound");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const jsonPath = join(outDir, `reddit-intent-${stamp}.json`);
  const mdPath = join(outDir, `reddit-intent-${stamp}.md`);

  const withDrafts = result.hits.map((h) => ({
    ...h,
    draftEmail: draftRedditIntentEmail(h),
  }));

  writeFileSync(jsonPath, JSON.stringify({ ...result, hits: withDrafts }, null, 2));

  const md = [
    `# Reddit intent hits — ${result.scannedAt}`,
    "",
    `Subs: ${result.config.subreddits.map((s) => `r/${s}`).join(", ")} · max age ${result.config.maxAgeHours}h · ${result.hits.length} posts`,
    "",
    ...withDrafts.map((h, i) => {
      return [
        `## ${i + 1}. ${h.title}`,
        `- **r/${h.subreddit}** · u/${h.author} · ${h.ageHours}h ago · score ${h.score} · intent ${h.intentScore}`,
        `- Query: \`${h.matchedQuery}\``,
        `- Link: ${h.permalink}`,
        `- Reasons: ${h.intentReasons.join(", ") || "—"}`,
        "",
        h.selftext ? `> ${h.selftext.slice(0, 400).replace(/\n/g, " ")}${h.selftext.length > 400 ? "…" : ""}` : "",
        "",
        `**Draft subject:** ${h.draftEmail.subject}`,
        "",
        "```",
        h.draftEmail.body,
        "```",
        "",
      ].join("\n");
    }),
  ].join("\n");

  writeFileSync(mdPath, md);
  console.log("wrote", jsonPath);
  console.log("wrote", mdPath);

  if (process.env.REDDIT_INTENT_PERSIST?.trim() === "1") {
    const wid = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
    if (!wid) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID required for persist");
    const persisted = await persistHits(wid, result.hits);
    console.log("persisted drafts", persisted);
  }

  // Print top 10 to console
  console.log("\n=== Top hits ===");
  for (const h of result.hits.slice(0, 10)) {
    console.log(`- [${h.intentScore}] r/${h.subreddit} (${h.ageHours}h) ${h.title}`);
    console.log(`  ${h.permalink}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
