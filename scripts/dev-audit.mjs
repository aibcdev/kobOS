#!/usr/bin/env node
/**
 * Start KOB (port 3000) + Inngest dev for local audit testing.
 * Usage: npm run dev:audit
 */
import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  execSync("node scripts/kill-port.mjs 3000", { cwd: root, stdio: "inherit" });
} catch {
  /* port already free */
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const web = spawn(npmCmd, ["run", "dev:public"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

const inngest = spawn(npmCmd, ["run", "inngest:dev"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

function shutdown(code = 0) {
  web.kill("SIGTERM");
  inngest.kill("SIGTERM");
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

web.on("exit", (c) => {
  if (c && c !== 0) shutdown(c);
});
inngest.on("exit", (c) => {
  if (c && c !== 0) shutdown(c);
});

console.log("\nKOB audit dev stack:");
console.log("  Site:    http://localhost:3000/audit");
console.log("  Inngest: http://localhost:8288");
console.log("Press Ctrl+C to stop both.\n");
