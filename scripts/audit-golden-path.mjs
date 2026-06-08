#!/usr/bin/env node
/**
 * End-to-end UK audit smoke (requires local dev + Inngest).
 *
 *   npm run dev:audit          # terminal 1
 *   npm run audit:golden-path  # terminal 2
 *
 * Optional env:
 *   AUDIT_GOLDEN_WEBSITE_URL=https://example.co.uk
 *   AUDIT_GOLDEN_PLACE_ID=ChIJ...
 *   AUDIT_GOLDEN_PLACE_NAME=Example Restaurant
 *   AUDIT_GOLDEN_PLACE_ADDRESS=1 High St, London
 *   AUDIT_GOLDEN_PLACE_LAT=51.5
 *   AUDIT_GOLDEN_PLACE_LNG=-0.12
 *   AUDIT_GOLDEN_BASE_URL=http://localhost:3000
 */
import { readFileSync, existsSync } from "node:fs";
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

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const base = (env.AUDIT_GOLDEN_BASE_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

const websiteUrl = env.AUDIT_GOLDEN_WEBSITE_URL?.trim() || "https://www.dishoom.com/";
const placeId = env.AUDIT_GOLDEN_PLACE_ID?.trim();
const placeName = env.AUDIT_GOLDEN_PLACE_NAME?.trim() || "Dishoom Covent Garden";
const placeAddress =
  env.AUDIT_GOLDEN_PLACE_ADDRESS?.trim() || "12 Upper St Martin's Lane, London WC2H 9FB, UK";
const placeLat = env.AUDIT_GOLDEN_PLACE_LAT ? Number(env.AUDIT_GOLDEN_PLACE_LAT) : 51.5125;
const placeLng = env.AUDIT_GOLDEN_PLACE_LNG ? Number(env.AUDIT_GOLDEN_PLACE_LNG) : -0.1269;

const POLL_MS = 4000;
const MAX_WAIT_MS = 180_000;

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

async function pollAudit(id) {
  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    const res = await fetch(`${base}/api/audit/${id}?scanning=1`, { cache: "no-store" });
    if (!res.ok) {
      fail(`GET /api/audit/${id} → ${res.status}`);
    }
    const data = await res.json();
    if (data.scanStatus === "failed") {
      fail(`Audit ${id} scan failed`);
    }
    if (data.scanStatus === "ready" && !data.scoresPending) {
      return data;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  fail(`Timed out after ${MAX_WAIT_MS / 1000}s waiting for scanStatus=ready`);
}

console.log(`Audit golden path — ${base}\n`);

const startBody = {
  websiteUrl,
  siteScope: "one",
  ...(placeId || placeName
    ? {
        place: {
          placeId: placeId || undefined,
          name: placeName,
          formattedAddress: placeAddress,
          lat: placeLat,
          lng: placeLng,
        },
      }
    : {}),
};

const startRes = await fetch(`${base}/api/audit/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(startBody),
});

if (!startRes.ok) {
  const err = await startRes.text().catch(() => "");
  fail(`POST /api/audit/start → ${startRes.status} ${err.slice(0, 300)}`);
}

const { id } = await startRes.json();
if (!id) fail("Start response missing audit id");

console.log(`Started audit ${id} — polling`);
const result = await pollAudit(id);
console.log("\n");

const competitors = result.competitors ?? [];
const placesCount = competitors.filter((c) => c.source === "places").length;

if (placesCount < 1) {
  fail(
    `Expected Places-sourced competitors, got ${placesCount}/${competitors.length}. ` +
      "Use AUDIT_GOLDEN_PLACE_* with a real UK place or pick from Google on /audit.",
  );
}

const overall = result.overallScore ?? result.scores?.overall ?? 0;
if (overall <= 0) {
  fail(`Expected non-zero overall score, got ${overall}`);
}

console.log("✓ scanStatus=ready");
console.log(`✓ competitors: ${placesCount} from Google Places`);
console.log(`✓ overallScore: ${overall}`);
console.log(`\nReport: ${base}/audit/${id}\n`);
