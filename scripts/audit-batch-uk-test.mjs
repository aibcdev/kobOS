#!/usr/bin/env node
/**
 * Run N UK restaurant audits via the public lead flow (POST /api/audit/start).
 * Usage: dotenv -e .env -e .env.local -- node scripts/audit-batch-uk-test.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(name) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val) out[key] = val;
  }
  return out;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local"), ...process.env };
const base = (env.AUDIT_GOLDEN_BASE_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const COUNT = Number(env.AUDIT_BATCH_COUNT || 10);
const POLL_MS = 4000;
const MAX_WAIT_MS = 240_000;

/** Curated UK independents — lead flow uses website URL + optional place pin. */
const CURATED_VENUES = [
  {
    name: "Bokman",
    websiteUrl: "https://bokman.co.uk",
    formattedAddress: "97-113 Great Eastern St, London EC2A 3HF, UK",
    lat: 51.5255,
    lng: -0.0832,
  },
  {
    name: "Ox and Finch",
    websiteUrl: "https://www.oxandfinch.com",
    formattedAddress: "920 Sauchiehall St, Glasgow G3 7TF, UK",
    lat: 55.8652,
    lng: -4.2847,
  },
  {
    name: "Wreckfish",
    websiteUrl: "https://wreckfish.co.uk",
    formattedAddress: "32 Seel St, Liverpool L1 4BE, UK",
    lat: 53.4015,
    lng: -2.9812,
  },
  {
    name: "Poco Tapas Bar",
    websiteUrl: "https://www.pocotapasbar.com",
    formattedAddress: "45 Jamaica St, Bristol BS1 4JP, UK",
    lat: 51.4534,
    lng: -2.5965,
  },
  {
    name: "Timberyard",
    websiteUrl: "https://www.timberyard.co.uk",
    formattedAddress: "10 Lady Lawson St, Edinburgh EH3 9DS, UK",
    lat: 55.9478,
    lng: -3.2034,
  },
  {
    name: "Ezra and Gil",
    websiteUrl: "https://www.ezraandgil.co.uk",
    formattedAddress: "20 Peter St, Manchester M2 5GB, UK",
    lat: 53.4789,
    lng: -2.2456,
  },
  {
    name: "Hooked",
    websiteUrl: "https://www.hookedbr.co.uk",
    formattedAddress: "15-16 Brighton Pl, Brighton BN1 1HJ, UK",
    lat: 50.8236,
    lng: -0.1384,
  },
  {
    name: "The Muddlers Club",
    websiteUrl: "https://www.themuddlersclub.com",
    formattedAddress: "1 Warehouse Ln, Belfast BT1 2DX, UK",
    lat: 54.5973,
    lng: -5.9301,
  },
  {
    name: "Chapter",
    websiteUrl: "https://www.chapteronecardiff.co.uk",
    formattedAddress: "6 High St, Cardiff CF10 1PT, UK",
    lat: 51.4816,
    lng: -3.1791,
  },
  {
    name: "The Olive Branch",
    websiteUrl: "https://www.theolivebranchpub.com",
    formattedAddress: "Main St, Clipsham, Rutland LE15 7SH, UK",
    lat: 52.7489,
    lng: -0.5645,
  },
];

async function pickVenue(cityQuery) {
  void cityQuery;
  return null;
}

async function pickCuratedVenues(count) {
  return CURATED_VENUES.slice(0, count);
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${base}/api/places/status`, { cache: "no-store" });
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await sleep(2000);
  }
  throw new Error(`Server not ready at ${base}`);
}

async function autocomplete(q) {
  const r = await fetch(`${base}/api/places/autocomplete?q=${encodeURIComponent(q)}`, { cache: "no-store" });
  if (!r.ok) return [];
  const data = await r.json();
  return data.suggestions ?? [];
}

async function placeDetails(placeId) {
  const r = await fetch(`${base}/api/places/details?placeId=${encodeURIComponent(placeId)}`, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

async function startAudit({ websiteUrl, place }) {
  const r = await fetch(`${base}/api/audit/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ websiteUrl, siteScope: "one", place }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`start ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function pollAudit(id) {
  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    const r = await fetch(`${base}/api/audit/${id}?scanning=1`, { cache: "no-store" });
    if (!r.ok) throw new Error(`poll ${r.status}`);
    const data = await r.json();
    if (data.scanStatus === "failed") throw new Error("scan failed");
    if (data.scanStatus === "ready" && !data.scoresPending) {
      const ps = data.perceptionAuditV1Status;
      if (ps === "ready" || ps === "failed" || ps === "skipped") return data;
      if (!ps && !process.env.GEMINI_API_KEY) return data;
    }
    process.stdout.write(".");
    await sleep(POLL_MS);
  }
  throw new Error("timeout");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pickVenueFromCurated(venue) {
  return {
    name: venue.name,
    websiteUrl: venue.websiteUrl,
    place: {
      name: venue.name,
      formattedAddress: venue.formattedAddress,
      lat: venue.lat,
      lng: venue.lng,
    },
  };
}

console.log(`UK audit batch — ${base} (target ${COUNT})\n`);
await waitForServer();

const results = [];
const venues = await pickCuratedVenues(COUNT);

for (const raw of venues) {
  process.stdout.write(`\n[${results.length + 1}/${COUNT}] ${raw.name}… `);
  const venue = await pickVenueFromCurated(raw);

  console.log(`${venue.name} → ${venue.websiteUrl}`);
  try {
    const { id } = await startAudit(venue);
    process.stdout.write(`  audit ${id} `);
    const polled = await pollAudit(id);
    console.log(" done");

    results.push({
      id,
      reportUrl: `${base}/audit/${id}`,
      name: polled.restaurantName || venue.name,
      city: polled.city,
      websiteUrl: polled.websiteUrl || venue.websiteUrl,
      overallScore: polled.overallScore,
      scores: polled.scores,
      seoScore: polled.seoScore,
      designScore: polled.designScore,
      mobileScore: polled.mobileScore,
      conversionScore: polled.conversionScore,
      competitors: polled.competitors ?? [],
      benchmarkV1Status: polled.benchmarkV1Status,
      benchmarkV1MediaStatus: polled.benchmarkV1MediaStatus,
      perceptionAuditV1Status: polled.perceptionAuditV1Status,
      perceptionSummary: polled.perceptionAuditV1?.overallSummary?.slice(0, 400) ?? null,
      perceptionGapCount: polled.perceptionAuditV1?.perceptionGap?.length ?? 0,
      benchmarkTopGaps: {
        seo: polled.benchmarkV1?.seo?.topGaps?.slice(0, 3) ?? [],
        web: polled.benchmarkV1?.websiteExperience?.topGaps?.slice(0, 3) ?? [],
      },
      browserbase: polled.browserbaseScan?.pipelineStage ?? null,
    });
  } catch (e) {
    console.log(` FAIL: ${e.message}`);
    results.push({ error: e.message, venue: venue.name, websiteUrl: venue.websiteUrl });
  }
}

const outDir = resolve(process.cwd(), "downloads/audit-batch");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
const outPath = resolve(outDir, `uk-batch-${stamp}.json`);
writeFileSync(outPath, JSON.stringify({ base, count: results.length, results }, null, 2));
console.log(`\nSaved ${outPath}\n`);

for (const r of results) {
  if (r.error) {
    console.log(`✗ ${r.venue}: ${r.error}`);
    continue;
  }
  const comp = r.competitors.filter((c) => c.source === "places").length;
  console.log(
    `${r.name} (${r.city}) — overall ${r.overallScore} | SEO ${r.seoScore} mobile ${r.mobileScore} | ${comp} competitors | ${r.reportUrl}`,
  );
}
