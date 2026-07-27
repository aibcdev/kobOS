/**
 * Verify Instagram for LeadProspects.
 *
 * Modes:
 *   MODE=search   — "{name} {city} Instagram" via open-source ddgs scraper (or Serper/Browserbase)
 *   MODE=website  — scrape each restaurant website for IG links + name match
 *   MODE=auto     — search if ddgs/Serper/Browserbase available, else website
 *
 * Setup open-source search (once):
 *   npm run outbound:ig-search-setup
 *
 *   DRY_RUN=1 LIMIT=20 MODE=search npm run outbound:verify-instagram
 *   WRITE=1 MODE=search CLEAR_BAD=1 INCLUDE_ARCHIVED=1 npm run outbound:verify-instagram
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { prisma } from "../lib/db/prisma";
import {
  hasDdgsScraper,
  hasInstagramSearchProvider,
  matchInstagramFromWebsite,
  normalizeInstagramUrl,
  verifyRestaurantInstagram,
  type InstagramMatchResult,
} from "../lib/lead-engine/discover-instagram";

const WID = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();
const LIMIT = Math.max(0, Number(process.env.LIMIT?.trim() || "0") || 0);
const OFFSET = Math.max(0, Number(process.env.OFFSET?.trim() || "0") || 0);
const CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.CONCURRENCY?.trim() || "4") || 4));
const DRY_RUN = process.env.DRY_RUN?.trim() === "1" || process.env.WRITE?.trim() !== "1";
const CLEAR_BAD = process.env.CLEAR_BAD?.trim() === "1";
const RESUME = process.env.RESUME?.trim() === "1";
const ONLY_MISSING = process.env.ONLY_MISSING?.trim() === "1";
const ONLY_EXISTING = process.env.ONLY_EXISTING?.trim() === "1";
const INCLUDE_ARCHIVED = process.env.INCLUDE_ARCHIVED?.trim() === "1";

const MODE_RAW = (process.env.MODE?.trim() || "auto").toLowerCase();
const MODE: "search" | "website" | "auto" =
  MODE_RAW === "search" || MODE_RAW === "website" || MODE_RAW === "auto"
    ? MODE_RAW
    : "auto";

const OUT_DIR = process.env.OUT_DIR?.trim() || "downloads/outbound";
const CHECKPOINT = `${OUT_DIR}/${process.env.CHECKPOINT_NAME?.trim() || "ig-verify-checkpoint.json"}`;
const REPORT = `${OUT_DIR}/${process.env.REPORT_NAME?.trim() || "ig-verify-report.json"}`;
const RESULTS_JSONL = `${OUT_DIR}/${process.env.RESULTS_NAME?.trim() || "ig-verify-results.jsonl"}`;
const IDS_FILE = process.env.IDS_FILE?.trim() || "";

type Checkpoint = {
  doneIds: string[];
  matched: number;
  unmatched: number;
  cleared: number;
  errors: number;
  mode: string;
  updatedAt: string;
};

type RowResult = {
  id: string;
  name: string;
  city: string;
  before: string | null;
  after: string | null;
  matched: boolean;
  score: number;
  reason: string;
  source: string;
  action: "set" | "keep" | "clear" | "none" | "error";
};

function resolveMode(): "search" | "website" {
  if (MODE === "website") return "website";
  if (MODE === "search") return "search";
  return hasInstagramSearchProvider() ? "search" : "website";
}

async function fetchWebsiteHtml(url: string | null | undefined): Promise<string | null> {
  if (!url?.trim()) return null;
  try {
    const href = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(href, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KOB-IGVerify/1.0; +https://trykob.com)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 150_000);
  } catch {
    return null;
  }
}

function isJunkExisting(url: string | null): boolean {
  if (!url) return false;
  return !normalizeInstagramUrl(url);
}

function loadCheckpoint(mode: string): Checkpoint {
  if (!RESUME || !existsSync(CHECKPOINT)) {
    return {
      doneIds: [],
      matched: 0,
      unmatched: 0,
      cleared: 0,
      errors: 0,
      mode,
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    const raw = JSON.parse(readFileSync(CHECKPOINT, "utf8")) as Checkpoint;
    if (raw.mode && raw.mode !== mode) {
      console.warn(`checkpoint mode=${raw.mode} != ${mode}; starting fresh`);
      return {
        doneIds: [],
        matched: 0,
        unmatched: 0,
        cleared: 0,
        errors: 0,
        mode,
        updatedAt: new Date().toISOString(),
      };
    }
    return { ...raw, mode };
  } catch {
    return {
      doneIds: [],
      matched: 0,
      unmatched: 0,
      cleared: 0,
      errors: 0,
      mode,
      updatedAt: new Date().toISOString(),
    };
  }
}

function saveCheckpoint(cp: Checkpoint) {
  mkdirSync(OUT_DIR, { recursive: true });
  cp.updatedAt = new Date().toISOString();
  writeFileSync(CHECKPOINT, JSON.stringify(cp, null, 2));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout_${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** One DB write at a time — concurrent updates hang the Supabase pooler. */
let dbWriteChain: Promise<void> = Promise.resolve();

async function withDbRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    const run = dbWriteChain.then(async () => {
      try {
        return await withTimeout(fn(), 12_000, "db");
      } catch (e) {
        await prisma.$disconnect().catch(() => {});
        throw e;
      }
    });
    // Keep the chain alive even on failure so the next writer can proceed.
    dbWriteChain = run.then(
      () => undefined,
      () => undefined,
    );
    try {
      return await run;
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (
        !/can't reach database|timed out|timeout|p1001|p1017|connection|closed/i.test(msg) ||
        i === attempts - 1
      ) {
        throw e;
      }
      console.warn(`[db] retry ${i + 1}/${attempts}: ${msg.slice(0, 100)}`);
      await sleep(800 * (i + 1));
    }
  }
  throw last;
}

function appendResultLog(row: RowResult) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(RESULTS_JSONL, `${JSON.stringify(row)}\n`, {
    flag: "a",
  });
}

const DEFER_DB = process.env.DEFER_DB?.trim() !== "0"; // default on — avoid pooler hangs mid-scrape

async function applyResult(
  prospectId: string,
  outboundLeadId: string | null,
  result: InstagramMatchResult,
  existing: string | null,
): Promise<RowResult["action"]> {
  void prospectId;
  void outboundLeadId;

  // Decide action; optionally skip live DB writes (flush JSONL → DB at end).
  let action: RowResult["action"] = "none";
  if (result.matched && result.url) {
    const same =
      existing && normalizeInstagramUrl(existing)?.handle === result.handle;
    action = same ? "keep" : "set";
  } else if (CLEAR_BAD && existing) {
    action = "clear";
  } else if (existing && isJunkExisting(existing)) {
    action = "clear";
  }

  if (DRY_RUN || DEFER_DB) return action;

  if (action === "set" || action === "keep") {
    await withDbRetry(() =>
      prisma.leadProspect.update({
        where: { id: prospectId },
        data: {
          instagramUrl: result.url!,
          enrichmentSource: `ig_${result.source}`,
        },
      }),
    );
  } else if (action === "clear") {
    await withDbRetry(() =>
      prisma.leadProspect.update({
        where: { id: prospectId },
        data: {
          instagramUrl: null,
          enrichmentSource: "ig_cleared",
        },
      }),
    );
  }

  return action;
}

async function flushResultsToDb() {
  const path = RESULTS_JSONL;
  if (!existsSync(path)) {
    console.log("no results jsonl to flush");
    return { written: 0, cleared: 0, errors: 0 };
  }
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  // Last write wins per id
  const byId = new Map<string, RowResult>();
  for (const line of lines) {
    try {
      const row = JSON.parse(line) as RowResult;
      byId.set(row.id, row);
    } catch {
      /* skip */
    }
  }

  let written = 0;
  let cleared = 0;
  let errors = 0;
  let n = 0;
  for (const row of byId.values()) {
    n += 1;
    try {
      if (row.matched && row.after) {
        await withDbRetry(() =>
          prisma.leadProspect.update({
            where: { id: row.id },
            data: {
              instagramUrl: row.after,
              enrichmentSource: `ig_${row.source}`,
            },
          }),
        );
        written += 1;
      } else if (row.action === "clear") {
        await withDbRetry(() =>
          prisma.leadProspect.update({
            where: { id: row.id },
            data: { instagramUrl: null, enrichmentSource: "ig_cleared" },
          }),
        );
        cleared += 1;
      }
      if (n % 50 === 0) {
        console.log(`[flush] ${n}/${byId.size} written=${written} cleared=${cleared}`);
        await prisma.$disconnect().catch(() => {});
        await sleep(300);
      }
    } catch (e) {
      errors += 1;
      console.warn(`[flush] fail ${row.name}:`, e instanceof Error ? e.message : e);
    }
  }
  return { written, cleared, errors, total: byId.size };
}

async function processOne(
  mode: "search" | "website",
  p: {
    id: string;
    name: string;
    city: string;
    websiteUrl: string | null;
    instagramUrl: string | null;
    outboundLeadId: string | null;
  },
): Promise<RowResult> {
  try {
    let result: InstagramMatchResult;

    if (mode === "website") {
      const html = await fetchWebsiteHtml(p.websiteUrl);
      if (!html || !p.websiteUrl) {
        result = {
          matched: false,
          score: 0,
          reason: !p.websiteUrl ? "no_website" : "website_fetch_failed",
          url: null,
          handle: null,
          title: null,
          snippet: null,
          source: "website",
        };
      } else {
        result = matchInstagramFromWebsite({
          name: p.name,
          city: p.city,
          websiteUrl: p.websiteUrl,
          websiteHtml: html,
        });
      }
    } else {
      // Search mode: skip website fetch by default (slow + flaky). Enable with FETCH_WEBSITE=1.
      const html =
        process.env.FETCH_WEBSITE?.trim() === "1"
          ? await fetchWebsiteHtml(p.websiteUrl)
          : null;
      result = await verifyRestaurantInstagram({
        name: p.name,
        city: p.city,
        websiteUrl: p.websiteUrl,
        existingInstagramUrl: p.instagramUrl,
        websiteHtml: html,
      });
      if (!result.matched && html && p.websiteUrl) {
        const fromSite = matchInstagramFromWebsite({
          name: p.name,
          city: p.city,
          websiteUrl: p.websiteUrl,
          websiteHtml: html,
        });
        if (fromSite.matched) result = fromSite;
      }
    }

    const action = await applyResult(p.id, p.outboundLeadId, result, p.instagramUrl);
    return {
      id: p.id,
      name: p.name,
      city: p.city,
      before: p.instagramUrl,
      after: result.matched ? result.url : action === "clear" ? null : p.instagramUrl,
      matched: result.matched,
      score: result.score,
      reason: result.reason,
      source: result.source,
      action,
    };
  } catch (e) {
    return {
      id: p.id,
      name: p.name,
      city: p.city,
      before: p.instagramUrl,
      after: p.instagramUrl,
      matched: false,
      score: 0,
      reason: e instanceof Error ? e.message : String(e),
      source: "none",
      action: "error",
    };
  }
}

async function main() {
  if (!WID) throw new Error("OUTBOUND_WORKSPACE_RESTAURANT_ID required");

  // Pooler drops cold connects — wait until DB answers before loading the cohort.
  for (let i = 0; i < 8; i++) {
    try {
      await prisma.$queryRawUnsafe("select 1");
      break;
    } catch (e) {
      if (i === 7) throw e;
      console.warn(`db warmup retry ${i + 1}/8`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }

  const mode = resolveMode();
  mkdirSync(OUT_DIR, { recursive: true });
  const cp = loadCheckpoint(mode);
  const done = new Set(cp.doneIds);

  if (MODE === "search" && !hasInstagramSearchProvider()) {
    console.error(
      "MODE=search needs the open-source ddgs scraper (or a paid SERP key).\n" +
        "  npm run outbound:ig-search-setup\n" +
        "Or set SERPER_API_KEY / BROWSERBASE_API_KEY.",
    );
    process.exit(1);
  }

  const where = {
    workspaceRestaurantId: WID,
    ...(INCLUDE_ARCHIVED ? {} : { status: { not: "ARCHIVED" as const } }),
    ...(ONLY_MISSING ? { instagramUrl: null } : {}),
    ...(ONLY_EXISTING ? { instagramUrl: { not: null } } : {}),
  };

  const idFilter = IDS_FILE
    ? (JSON.parse(readFileSync(IDS_FILE, "utf8")) as string[]).filter(Boolean)
    : null;

  const total = idFilter ? idFilter.length : await prisma.leadProspect.count({ where });

  let prospectsRaw: Array<{
    id: string;
    name: string;
    city: string;
    websiteUrl: string | null;
    instagramUrl: string | null;
    outboundLeadId: string | null;
  }> = [];

  if (idFilter) {
    const chunkSize = 400;
    for (let i = 0; i < idFilter.length; i += chunkSize) {
      const chunk = idFilter.slice(i, i + chunkSize);
      const rows = await prisma.leadProspect.findMany({
        where: { workspaceRestaurantId: WID, id: { in: chunk } },
        select: {
          id: true,
          name: true,
          city: true,
          websiteUrl: true,
          instagramUrl: true,
          outboundLeadId: true,
        },
      });
      prospectsRaw.push(...rows);
    }
  } else {
    prospectsRaw = await prisma.leadProspect.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: OFFSET,
      ...(LIMIT > 0 ? { take: LIMIT } : {}),
      select: {
        id: true,
        name: true,
        city: true,
        websiteUrl: true,
        instagramUrl: true,
        outboundLeadId: true,
      },
    });
  }
  const prospects = LIMIT > 0 && idFilter ? prospectsRaw.slice(0, LIMIT) : prospectsRaw;

  const queue = prospects.filter((p) => !done.has(p.id));
  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        clearBad: CLEAR_BAD,
        resume: RESUME,
        modeRequested: MODE,
        modeRunning: mode,
        concurrency: CONCURRENCY,
        idsFile: IDS_FILE || null,
        checkpoint: CHECKPOINT,
        results: RESULTS_JSONL,
        totalEligible: total,
        loaded: prospects.length,
        remaining: queue.length,
        alreadyDone: done.size,
        hasSerper: Boolean(process.env.SERPER_API_KEY?.trim()),
        hasBrowserbase: Boolean(process.env.BROWSERBASE_API_KEY?.trim()),
        hasDdgs: hasDdgsScraper(),
        deferDb: DEFER_DB,
      },
      null,
      2,
    ),
  );

  if (mode === "website") {
    console.log(
      "Running website scrape mode. For search-based matching: npm run outbound:ig-search-setup && MODE=search",
    );
  }

  // Drop idle pooler connections during long scrape — reconnect only for flush.
  await prisma.$disconnect().catch(() => {});

  const sample: RowResult[] = [];
  let i = 0;

  async function worker() {
    while (i < queue.length) {
      const idx = i++;
      const p = queue[idx]!;
      if (idx < 5 || (idx + 1) % 10 === 0) {
        console.log(`… starting ${idx + 1}/${queue.length}: ${p.name}`);
      }
      const row = await withTimeout(processOne(mode, p), 90_000, "prospect").catch(
        (e): RowResult => ({
          id: p.id,
          name: p.name,
          city: p.city,
          before: p.instagramUrl,
          after: p.instagramUrl,
          matched: false,
          score: 0,
          reason: e instanceof Error ? e.message : String(e),
          source: "none",
          action: "error",
        }),
      );
      done.add(p.id);
      cp.doneIds.push(p.id);
      if (row.matched) cp.matched += 1;
      else cp.unmatched += 1;
      if (row.action === "clear") cp.cleared += 1;
      if (row.action === "error") cp.errors += 1;

      appendResultLog(row);
      if (sample.length < 80) sample.push(row);

      if ((idx + 1) % 10 === 0 || idx === queue.length - 1) {
        saveCheckpoint(cp);
        console.log(
          `[${idx + 1}/${queue.length}] matched=${cp.matched} unmatched=${cp.unmatched} cleared=${cp.cleared} errors=${cp.errors} last=${row.name} → ${row.matched ? row.after : row.reason}`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  saveCheckpoint(cp);

  let flush: { written: number; cleared: number; errors: number; total?: number } | null = null;
  if (!DRY_RUN && DEFER_DB) {
    console.log("flushing JSONL results to database…");
    flush = await flushResultsToDb();
    console.log("flush done", flush);
  }

  // Final gate: drop handles whose recent posts aren't food pages.
  if (!DRY_RUN && process.env.SKIP_FOOD_AUDIT?.trim() !== "1") {
    console.log("running Instagram food-page audit…");
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync(
      "npm",
      ["run", "outbound:audit-instagram-food"],
      {
        env: { ...process.env, WRITE: "1", DRY_RUN: "0" },
        stdio: "inherit",
        shell: true,
      },
    );
    if (r.status !== 0) {
      console.warn("food audit exited", r.status);
    }
  }

  const withIg = await prisma.leadProspect.count({
    where: {
      workspaceRestaurantId: WID,
      ...(INCLUDE_ARCHIVED ? {} : { status: { not: "ARCHIVED" } }),
      instagramUrl: { not: null },
    },
  });

  const report = {
    finishedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    deferDb: DEFER_DB,
    clearBad: CLEAR_BAD,
    mode,
    flush,
    stats: {
      matched: cp.matched,
      unmatched: cp.unmatched,
      cleared: cp.cleared,
      errors: cp.errors,
      done: cp.doneIds.length,
      withInstagramNow: withIg,
    },
    sample: sample.filter((s) => s.matched || s.action === "clear").slice(0, 40),
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
    await prisma.$disconnect();
  });
