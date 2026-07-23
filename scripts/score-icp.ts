#!/usr/bin/env npx tsx
/**
 * CLI for ICP Fit Score (icp-fit-v1).
 *
 *   npx tsx scripts/score-icp.ts restaurants.json --pretty
 *   npx tsx scripts/score-icp.ts restaurants.json --qualified-only
 *   cat scraped.json | npx tsx scripts/score-icp.ts - --qualified-only
 */

import { readFileSync } from "node:fs";

import {
  filterQualified,
  scoreIcpBatch,
  type IcpRestaurantInput,
} from "../lib/outbound/score-icp";

function usage(): never {
  console.error(`Usage: npx tsx scripts/score-icp.ts <file|- > [--pretty] [--qualified-only]`);
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

function loadInput(file: string): IcpRestaurantInput[] {
  const raw = file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8");
  const data = JSON.parse(raw) as IcpRestaurantInput | IcpRestaurantInput[];
  return Array.isArray(data) ? data : [data];
}

const { file, pretty, qualifiedOnly } = parseArgs(process.argv.slice(2));
const inputs = loadInput(file);
let results = scoreIcpBatch(inputs);
if (qualifiedOnly) results = filterQualified(results);

const out = pretty ? JSON.stringify(results, null, 2) : JSON.stringify(results);
process.stdout.write(`${out}\n`);
