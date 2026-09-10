import { expect, test } from "@playwright/test";

test("audit entry and honest trial message are available", async ({ page }) => {
  await page.goto("/audit");
  await expect(page).toHaveTitle(/audit/i);
  await expect(page.getByRole("main")).toBeVisible();

  await page.goto("/signup?email=owner%40example.com&name=Test%20Restaurant");
  await expect(page.getByText(/card.*required|requires.*card/i)).toBeVisible();
});

test("cron routes reject unauthorised calls", async ({ request }) => {
  for (const path of ["/api/cron/outbound", "/api/cron/audit-drain", "/api/cron/health-watch"]) {
    const response = await request.get(path);
    expect([401, 403]).toContain(response.status());
  }
});
