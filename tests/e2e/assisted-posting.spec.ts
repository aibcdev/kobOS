import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

/**
 * Assisted posting (GBP_LIVE off): paste a review → KOB drafts a reply → Approve, copy & open Google → I've posted it.
 * Checks the reply reaches the clipboard, Google opens in a new tab, the row ends DONE_BY_OWNER, and nothing was handed
 * to the executor (so no Google API call). Needs E2E_DATABASE_URL, like approval.spec.ts.
 */
const DB = process.env.E2E_DATABASE_URL;
const PREVIEW_USER_ID = "00000000-0000-4000-8000-000000000001";

test.describe("assisted posting", () => {
  test.skip(!DB, "set E2E_DATABASE_URL to run");
  test.setTimeout(120_000);

  let prisma: PrismaClient;
  let restaurantId: string;

  test.beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DB! } } });
    const suffix = Date.now().toString(36);
    await prisma.user.upsert({
      where: { id: PREVIEW_USER_ID },
      create: { id: PREVIEW_USER_ID, email: "preview@kob.local" },
      update: {},
    });
    await prisma.teamMember.deleteMany({ where: { userId: PREVIEW_USER_ID } });
    const restaurant = await prisma.restaurant.create({ data: { name: `E2E Cafe ${suffix}`, slug: `e2e-assist-${suffix}` } });
    restaurantId = restaurant.id;
    await prisma.teamMember.create({ data: { userId: PREVIEW_USER_ID, restaurantId, role: "OWNER" } });
  });

  test.afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  test("paste → draft → approve, copy & open Google → posted by owner", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    // Never reach the real Google from a test.
    await context.route(/^https:\/\/(business|search|www|maps)\.google\.com\//, (r) => r.fulfill({ body: "google stub" }));

    // 1. Paste a review.
    await page.goto("/app/reviews");
    const form = page.getByTestId("add-reviews");
    await expect(form).toBeVisible({ timeout: 60_000 });
    await form.getByRole("tab", { name: "Paste several" }).click();
    await form.locator("textarea").fill("Sam Patel\n★★★★★\nThe lamb was perfect and the staff were lovely.\nhttps://maps.google.com/review/e2e");
    await form.getByRole("button", { name: "Add and draft replies" }).click();
    await expect(form.getByRole("status")).toContainText("Added 1 review", { timeout: 30_000 });

    // 2. The draft waits for the owner.
    const action = await prisma.osAction.findFirstOrThrow({ where: { restaurantId, actionType: "gbp.review.reply" } });
    expect(action.status).toBe("AWAITING_APPROVAL");
    const reply = (action.proposedPayload as { replyText: string }).replyText;

    await page.goto("/app/needs-you");
    const card = page.getByTestId("post-card").filter({ hasText: "Sam" });
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card).toContainText("The lamb was perfect");

    // 3. Approve, copy & open Google.
    const popup = context.waitForEvent("page");
    await card.getByRole("button", { name: "Approve, copy & open Google" }).click();
    expect((await popup).url()).toBe("https://maps.google.com/review/e2e");
    await expect(card.getByRole("status")).toHaveText("Copied. Paste it into Google and press Post.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(reply);
    await expect(card).toHaveAttribute("data-status", "APPROVED");

    // 4. I've posted it.
    await card.getByRole("button", { name: "I've posted it" }).click();
    await expect(card).toHaveAttribute("data-status", "DONE_BY_OWNER");
    await expect(card.getByTestId("action-status-text")).toContainText("Posted by you");

    const done = await prisma.osAction.findUniqueOrThrow({ where: { id: action.id } });
    expect(done.status).toBe("DONE_BY_OWNER");
    expect(done.executionStartedAt).toBeNull();
    const kinds = (await prisma.osAuditEvent.findMany({ where: { actionId: action.id } })).map((e) => e.kind);
    expect(kinds).toEqual(expect.arrayContaining(["action.approved", "assist.copied", "assist.opened_google", "action.done_by_owner"]));
    expect(kinds).not.toContain("action.executing");
  });
});
