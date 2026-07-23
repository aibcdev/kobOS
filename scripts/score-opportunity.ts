#!/usr/bin/env npx tsx
/**
 * CLI for Opportunity Score Engine (opportunity-v1).
 *
 *   npx tsx scripts/score-opportunity.ts restaurants.json --pretty
 *   npx tsx scripts/score-opportunity.ts restaurants.json --qualified-only
 *   cat scraped.json | npx tsx scripts/score-opportunity.ts - --qualified-only
 */

import { readFileSync } from "node:fs";

import {
  calculateOpportunityScoreBatch,
  filterOpportunityQualified,
  type OpportunityRestaurantInput,
} from "../lib/outbound/score-opportunity";

function usage(): never {
  console.error(
    `Usage: npx tsx scripts/score-opportunity.ts <file|-> [--pretty] [--qualified-only]`,
  );
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const file = positional[0];
  if (!file) usage();
  return {
    file,
    pretty: flags.has("--pretty"),
    qualifiedOnly: flags.has("--qualified-only"),
  };
}

function loadInput(file: string): OpportunityRestaurantInput[] {
  const raw = file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8");
  const data = JSON.parse(raw) as OpportunityRestaurantInput | OpportunityRestaurantInput[];
  return Array.isArray(data) ? data : [data];
}

const { file, pretty, qualifiedOnly } = parseArgs(process.argv.slice(2));
const inputs = loadInput(file);
let results = calculateOpportunityScoreBatch(inputs);
if (qualifiedOnly) results = filterOpportunityQualified(results);

const payload = results.length === 1 ? results[0] : results;
process.stdout.write(`${JSON.stringify(payload, null, pretty ? 2 : undefined)}\n`);
