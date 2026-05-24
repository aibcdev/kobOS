#!/usr/bin/env node
import { execSync } from "node:child_process";

const port = process.argv[2] ?? "3000";
try {
  const pids = execSync(`lsof -ti :${port}`, { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  if (!pids.length) {
    console.log(`Port ${port} is free.`);
    process.exit(0);
  }
  for (const pid of pids) {
    execSync(`kill -9 ${pid}`);
  }
  console.log(`Freed port ${port} (killed ${pids.length} process(es)).`);
} catch {
  console.log(`Port ${port} is free.`);
}
