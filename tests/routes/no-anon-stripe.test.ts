import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("anonymous Stripe trial route", () => {
  it("does not exist, so /api/kob/trial is a 404", () => {
    expect(existsSync(path.join(root, "app/api/kob/trial/route.ts"))).toBe(false);
  });

  it("is not called from app code", () => {
    const callers = ["app", "components", "lib"]
      .flatMap((dir) => sourceFiles(path.join(root, dir)))
      .filter((file) => readFileSync(file, "utf8").includes("/api/kob/trial"));
    expect(callers).toEqual([]);
  });
});
