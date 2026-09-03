/**
 * Optional ops script: score a curated subset of Elias-style restaurant URLs.
 * Does NOT hardcode host floors — prints measured scores for manual calibration.
 *
 * Usage: npx tsx scripts/audit-elias-calibration.ts
 */
import { analyzeWebsiteFull } from "@/lib/audit/analyze-url";
import { buildEvidencePackV1 } from "@/lib/audit/evidence-pack";
import { applyRubricV2ToPayload, computeRubricV2 } from "@/lib/audit/rubric-v2";
import { computeRestaurantScores } from "@/lib/audit/restaurant-scoring";
import type { AuditResultPayload } from "@/lib/audit/types";

const SAMPLE: { name: string; url: string }[] = [
  { name: "Noma", url: "https://noma.dk" },
  { name: "Girl & the Goat", url: "https://www.girlandthegoat.com" },
  { name: "Sunday in Brooklyn", url: "https://www.sundayinbrooklyn.com" },
  { name: "Eleven Madison Park", url: "https://www.elevenmadisonpark.com" },
];

async function scoreOne(name: string, url: string) {
  const analysis = await analyzeWebsiteFull(url);
  const pack = buildEvidencePackV1({
    restaurantName: name,
    city: "Calibration",
    websiteUrl: url,
    signals: analysis.signals,
    pageEvidence: analysis.pageEvidence,
    engagementSignals: analysis.engagementSignals,
    guestSignals: analysis.guestSignals,
  });
  const rubric = computeRubricV2({ evidencePack: pack });
  const payload = applyRubricV2ToPayload(
    {
      restaurantName: name,
      city: "Calibration",
      websiteUrl: url,
      competitors: [],
      opportunities: [],
      scores: { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 },
      evidencePack: pack,
    } as AuditResultPayload,
    rubric,
  );
  const rs = computeRestaurantScores(payload);
  return {
    name,
    url,
    fetched: analysis.signals.fetched,
    social: analysis.pageEvidence.socialLinksFound.length,
    overall: rs.overall,
    grade: rs.grade,
    website: rs.website,
    technical: rs.technical,
  };
}

async function main() {
  for (const row of SAMPLE) {
    try {
      const result = await scoreOne(row.name, row.url);
      console.log(JSON.stringify(result));
    } catch (e) {
      console.log(JSON.stringify({ name: row.name, url: row.url, error: String(e) }));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
