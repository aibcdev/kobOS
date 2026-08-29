#!/usr/bin/env node
/**
 * KOB production is Git-only. CLI --prod overwrote trykob.com with BELLY.
 */
const args = process.argv.slice(2);
if (args.includes("--prod") || args.includes("--production")) {
  console.error(
    "Blocked: trykob.com (kobkob) does not accept CLI production deploys.\n" +
      "Push to GitHub aibcdev/kobOS main, or use a Deploy Preview without --prod.",
  );
  process.exit(1);
}

const { spawnSync } = require("child_process");
const r = spawnSync("npx", ["netlify-cli", "deploy", ...args], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});
process.exit(r.status ?? 1);
