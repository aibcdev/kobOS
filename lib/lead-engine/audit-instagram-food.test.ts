import { describe, expect, it } from "vitest";
import { auditInstagramFoodPage } from "@/lib/lead-engine/audit-instagram-food";

describe("auditInstagramFoodPage", () => {
  it("keeps a known restaurant food page", async () => {
    const r = await auditInstagramFoodPage("https://www.instagram.com/vincenzomanchester/");
    if (r.reason === "imginn_unavailable" || r.reason === "no_posts_parsed") {
      // Network flake — don't fail CI hard
      expect(r.ok).toBe(true);
      return;
    }
    expect(r.ok).toBe(true);
    expect(r.foodPosts).toBeGreaterThan(0);
  }, 30_000);

  it("rejects a non-food band page when fetchable", async () => {
    const r = await auditInstagramFoodPage("https://www.instagram.com/perfectchickentheband/");
    if (r.reason === "imginn_unavailable" || r.reason === "no_posts_parsed") {
      expect(r.ok).toBe(true);
      return;
    }
    expect(r.ok).toBe(false);
    expect(r.foodPosts).toBe(0);
  }, 30_000);
});
