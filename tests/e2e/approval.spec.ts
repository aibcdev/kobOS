import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

/**
 * Seeds a proposal, approves it in the UI, and checks the card says "Done" only once the row is VERIFIED.
 * Needs E2E_DATABASE_URL (a migrated database); playwright.config.ts then starts the dev server in UI preview
 * mode with KOB_INLINE_ACTIONS=1, so the executor runs in-process against the memory adapter.
 */
const DB = process.env.E2E_DATABASE_URL;
const PREVIEW_USER_ID = "00000000-0000-4000-8000-000000000001";

test.describe("approval card", () => {
  test.skip(!DB, "set E2E_DATABASE_URL to run");
  test.setTimeout(120_000);

  let prisma: PrismaClient;
  let restaurantId: string;
  let actionId: string;
  // Random minute so a re-run against the same dev server isn't "already correct".
  let openAt: string;

  test.beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DB! } } });
    const suffix = Date.now().toString(36);
    openAt = `11:${String(10 + Math.floor(Math.random() * 50))}`;
    await prisma.user.upsert({
      where: { id: PREVIEW_USER_ID },
      create: { id: PREVIEW_USER_ID, email: "preview@kob.local" },
      update: {},
    });
    // The preview user sees its first membership; give it a fresh restaurant created first.
    await prisma.teamMember.deleteMany({ where: { userId: PREVIEW_USER_ID } });
    const restaurant = await prisma.restaurant.create({ data: { name: `E2E Bistro ${suffix}`, slug: `e2e-${suffix}` } });
    restaurantId = restaurant.id;
    await prisma.teamMember.create({ data: { userId: PREVIEW_USER_ID, restaurantId, role: "OWNER" } });
    // This covers automatic posting; assisted-posting.spec.ts covers GBP_LIVE off.
    await prisma.featureFlagOverride.create({ data: { restaurantId, name: "GBP_LIVE", enabled: true } });
    const action = await prisma.osAction.create({
      data: {
        restaurantId,
        actionType: "gbp.hours.regular.update",
        connector: "GBP",
        status: "AWAITING_APPROVAL",
        title: `Open at ${openAt} on Mondays`,
        ownerFacingSummary: `Google shows 12:00; your menu says ${openAt}.`,
        proposedPayload: {
          actionType: "gbp.hours.regular.update",
          gbpLocationId: `e2e-${suffix}`,
          periods: [{ day: "MONDAY", open: openAt, close: "22:00" }],
        },
        riskScore: 39,
        idempotencyKey: `e2e-${suffix}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    actionId = action.id;
  });

  test.afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  test("propose → approve → Done only after VERIFIED", async ({ page }) => {
    await page.goto("/app/needs-you");
    const card = page.locator(`[data-testid="approval-card"][data-action-id="${actionId}"]`);
    await expect(card).toHaveAttribute("data-hydrated", "true", { timeout: 60_000 });
    await expect(card.getByTestId("action-status-text")).toHaveText("Draft only — needs your yes.");

    // Approve from the detail page: it shows the card in every state, so a dev-server reload can't hide it.
    // goto rather than click: in dev, a client navigation can fire before the router initialises.
    await expect(card.getByRole("link", { name: "Details" })).toHaveAttribute("href", `/app/actions/${actionId}`);
    await page.goto(`/app/actions/${actionId}`);
    const detail = page.locator(`[data-testid="approval-card"][data-action-id="${actionId}"]`);
    await expect(detail).toHaveAttribute("data-hydrated", "true", { timeout: 60_000 });
    await detail.getByRole("button", { name: "Approve", exact: true }).click();

    // Sample what the card says alongside the row's real status until it settles.
    const text = detail.getByTestId("action-status-text");
    const seen: { ui: string; db: string }[] = [];
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      const ui = (await text.textContent())?.trim() ?? "";
      const db = (await prisma.osAction.findUniqueOrThrow({ where: { id: actionId } })).status;
      seen.push({ ui, db });
      if (ui === "Done") break;
      await page.waitForTimeout(150);
    }

    expect(seen.at(-1)?.ui).toBe("Done");
    expect(seen.filter((s) => s.ui === "Done" && s.db !== "VERIFIED")).toEqual([]);
    expect(seen.some((s) => s.ui === "On it…" || s.ui === "Sent — waiting for confirmation.")).toBe(true);
    await expect(detail.getByTestId("action-status")).toHaveAttribute("data-status", "VERIFIED");

    await page.goto("/app/activity");
    await expect(page.getByRole("link", { name: `Open at ${openAt} on Mondays` })).toBeVisible();
  });
});
