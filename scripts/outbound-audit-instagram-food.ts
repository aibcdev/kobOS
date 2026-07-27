/**
 * After Instagram discovery: drop handles whose recent posts aren't food/hospitality.
 *
 * Reads matched URLs from:
 *   1) downloads/outbound/ig-verify-results.jsonl (preferred, post-scrape)
 *   2) else LeadProspect rows with enrichmentSource starting with ig_
 *
 *   DRY_RUN=1 LIMIT=30 npm run outbound:audit-instagram-food
 *   WRITE=1 npm run outbound:audit-instagram-food
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import { prisma } from "../lib/db/prisma";
import { auditInstagramFoodPage } from "../lib/lead-engine/audit-instagram-food";
import { normalizeInstagramUrl } from "../lib/lead-engine/discover-instagram";

const WID = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
const LIMIT = Math.max(0, Number(process.env.LIMIT?.trim() || "0") || 0);
const CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.CONCURRENCY?.trim() || "2") || 2));
const DRY_RUN = process.env.DRY_RUN?.trim() === "1" || process.env.WRITE?.trim() !== "1";
const OUT_DIR = "downloads/outbound";
const JSONL = `${OUT_DIR}/ig-verify-results.jsonl`;
const REPORT = `${OUT_DIR}/ig-food-audit-report.json`;
const CLEARED_LOG = `${OUT_DIR}/ig-food-audit-cleared.jsonl`;

type Target = {
  id: string;
  name: string;
  city: string;
  instagramUrl: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withDbTimeout<T>(fn: () => Promise<T>, ms = 12_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`db_timeout_${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function loadTargetsFromJsonl(): Target[] {
  if (!existsSync(JSONL)) return [];
  const byId = new Map<string, Target>();
  for (const line of readFileSync(JSONL, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as {
        id: string;
        name: string;
        city: string;
        after: string | null;
        matched: boolean;
        action: string;
      };
      if (!row.matched || !row.after) continue;
      if (row.action === "clear") {
        byId.delete(row.id);
        continue;
      }
      const norm = normalizeInstagramUrl(row.after);
      if (!norm) continue;
      byId.set(row.id, {
        id: row.id,
        name: row.name,
        city: row.city,
        instagramUrl: norm.url,
      });
    } catch {
      /* skip */
    }
  }
  return [...byId.values()];
}

async function loadTargetsFromDb(): Promise<Target[]> {
  if (!WID) return [];
  const rows = await prisma.leadProspect.findMany({
    where: {
      workspaceRestaurantId: WID,
      instagramUrl: { not: null },
      OR: [
        { enrichmentSource: { startsWith: "ig_" } },
        { enrichmentSource: { contains: "instagram" } },
      ],
    },
    select: { id: true, name: true, city: true, instagramUrl: true },
  });
  return rows
    .map((r) => {
      const norm = r.instagramUrl ? normalizeInstagramUrl(r.instagramUrl) : null;
      if (!norm) return null;
      return { id: r.id, name: r.name, city: r.city, instagramUrl: norm.url };
    })
    .filter(Boolean) as Target[];
}

async function clearProspect(id: string, reason: string) {
  if (DRY_RUN) return;
  for (let i = 0; i < 4; i++) {
    try {
      await withDbTimeout(() =>
        prisma.leadProspect.update({
          where: { id },
          data: {
            instagramUrl: null,
            enrichmentSource: `ig_food_audit_cleared:${reason}`,
          },
        }),
      );
      return;
    } catch (e) {
      await prisma.$disconnect().catch(() => {});
      await sleep(600 * (i + 1));
      if (i === 3) throw e;
    }
  }
}

async function main() {
  if (!WID) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID required");
  mkdirSync(OUT_DIR, { recursive: true });

  let targets = loadTargetsFromJsonl();
  const from = targets.length ? "jsonl" : "db";
  if (!targets.length) targets = await loadTargetsFromDb();
  if (LIMIT > 0) targets = targets.slice(0, LIMIT);

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        source: from,
        targets: targets.length,
        concurrency: CONCURRENCY,
      },
      null,
      2,
    ),
  );

  // Don't hold pooler open during imginn scrape
  await prisma.$disconnect().catch(() => {});

  const cleared: Array<Record<string, unknown>> = [];
  const kept: Array<Record<string, unknown>> = [];
  const skipped: Array<Record<string, unknown>> = [];
  let i = 0;

  async function worker() {
    while (i < targets.length) {
      const idx = i++;
      const t = targets[idx]!;
      const audit = await auditInstagramFoodPage(t.instagramUrl);
      const row = {
        id: t.id,
        name: t.name,
        city: t.city,
        handle: audit.handle,
        url: audit.url,
        ok: audit.ok,
        reason: audit.reason,
        foodPosts: audit.foodPosts,
        postsChecked: audit.postsChecked,
        samplePosts: audit.posts.slice(0, 3),
      };

      if (!audit.ok && audit.reason !== "imginn_unavailable" && audit.reason !== "no_posts_parsed") {
        await clearProspect(t.id, audit.reason);
        cleared.push(row);
        appendFileSync(CLEARED_LOG, `${JSON.stringify(row)}\n`);
      } else if (!audit.ok) {
        skipped.push(row);
      } else if (audit.reason === "imginn_unavailable" || audit.reason === "no_posts_parsed") {
        skipped.push(row);
      } else {
        kept.push(row);
      }

      if ((idx + 1) % 10 === 0 || idx === targets.length - 1) {
        console.log(
          `[${idx + 1}/${targets.length}] kept=${kept.length} cleared=${cleared.length} skipped=${skipped.length} last=${t.name} → ${audit.ok ? "keep" : audit.reason}`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const report = {
    finishedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    source: from,
    stats: {
      audited: targets.length,
      kept: kept.length,
      cleared: cleared.length,
      skipped: skipped.length,
    },
    clearedSample: cleared.slice(0, 40),
    keptSample: kept.slice(0, 15),
  };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.stats, null, 2));
  console.log(`wrote ${REPORT}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
