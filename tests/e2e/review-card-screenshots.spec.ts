import { mkdirSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

/**
 * Before-and-after screenshots of the review card for PRs: the auto-mode approval card (GBP_LIVE on) next to the
 * assisted card in each state (drafted, approved and copied, posted by you) and the home counter. Not a check; run it
 * on purpose:
 *
 *   E2E_DATABASE_URL=… SCREENSHOTS_DIR=docs/screenshots/review-card npx playwright test review-card-screenshots
 */
const DB = process.env.E2E_DATABASE_URL;
const OUT = process.env.SCREENSHOTS_DIR;
const PREVIEW_USER_ID = "00000000-0000-4000-8000-000000000001";

test.describe("review card screenshots", () => {
  test.skip(!DB || !OUT, "set E2E_DATABASE_URL and SCREENSHOTS_DIR to run");
  test.setTimeout(180_000);
  test.use({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 });

  let prisma: PrismaClient;
  let restaurantId: string;
  let actionId: string;

  test.beforeAll(async () => {
    mkdirSync(OUT!, { recursive: true });
    prisma = new PrismaClient({ datasources: { db: { url: DB! } } });
    const suffix = Date.now().toString(36);
    await prisma.user.upsert({ where: { id: PREVIEW_USER_ID }, create: { id: PREVIEW_USER_ID, email: "preview@kob.local" }, update: {} });
    await prisma.teamMember.deleteMany({ where: { userId: PREVIEW_USER_ID } });
    const restaurant = await prisma.restaurant.create({ data: { name: "Osteria Lume", slug: `shots-${suffix}` } });
    restaurantId = restaurant.id;
    await prisma.teamMember.create({ data: { userId: PREVIEW_USER_ID, restaurantId, role: "OWNER" } });
    const reviewId = `shots-${suffix}`;
    await prisma.customerReview.create({
      data: {
        restaurantId,
        source: "GOOGLE",
        externalReviewId: reviewId,
        reviewerName: "Sam Patel",
        rating: 2,
        body: "Lovely pasta but we waited 40 minutes for mains and nobody checked on us.",
        reviewedAt: new Date(Date.now() - 2 * 86_400_000),
      },
    });
    const action = await prisma.osAction.create({
      data: {
        restaurantId,
        actionType: "gbp.review.reply",
        title: "Reply to Sam's 2-star review",
        status: "AWAITING_APPROVAL",
        connector: "GBP",
        riskScore: 30,
        taskKey: `review:${reviewId}`,
        proposedPayload: {
          actionType: "gbp.review.reply",
          reviewId,
          replyText:
            "Hi Sam, thank you for telling us, and I'm sorry about the wait for mains. That's not the evening we want anyone to have. I've shared this with the team. Glad the pasta hit the spot, and I hope we can show you a smoother night next time. Marco",
        },
      },
    });
    actionId = action.id;
  });

  test.afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  const shot = (name: string) => path.join(OUT!, `${name}.png`);

  test("before (auto) and after (assisted)", async ({ page, context }) => {
    await context.route(/^https:\/\/(business|search|www|maps)\.google\.com\//, (r) => r.fulfill({ body: "google stub" }));

    // Before: Google posting on, so KOB would publish after approval.
    await prisma.featureFlagOverride.create({ data: { restaurantId, name: "GBP_LIVE", enabled: true } });
    await page.goto(`/app/actions/${actionId}`);
    const before = page.getByTestId("approval-card");
    await expect(before).toBeVisible({ timeout: 90_000 });
    await before.screenshot({ path: shot("1-before-auto-approval-card") });

    // After: Google posting off, the owner posts by hand.
    await prisma.featureFlagOverride.deleteMany({ where: { restaurantId, name: "GBP_LIVE" } });
    await page.reload();
    const card = page.getByTestId("post-card");
    await expect(card).toBeVisible({ timeout: 60_000 });
    await card.screenshot({ path: shot("2-after-drafted") });

    await prisma.osAction.update({ where: { id: actionId }, data: { status: "APPROVED", approvedAt: new Date(Date.now() - 26 * 3_600_000) } });
    await page.reload();
    await expect(page.getByTestId("post-card")).toHaveAttribute("data-status", "APPROVED", { timeout: 60_000 });
    await page.getByTestId("post-card").screenshot({ path: shot("3-after-approved-copied") });

    // Needs you: approved but not posted yet sits under "Ready to post".
    await page.goto("/app/needs-you");
    const ready = page.getByRole("heading", { name: "Ready to post: 1" });
    await expect(ready).toBeVisible({ timeout: 60_000 });
    await ready.locator("xpath=ancestor::section[1]").screenshot({ path: shot("4-needs-you-ready-to-post") });

    await prisma.osAction.update({ where: { id: actionId }, data: { status: "DONE_BY_OWNER" } });
    await page.goto(`/app/actions/${actionId}`);
    await expect(page.getByTestId("post-card")).toHaveAttribute("data-status", "DONE_BY_OWNER", { timeout: 60_000 });
    await page.getByTestId("post-card").screenshot({ path: shot("5-after-posted-by-you") });
  });
});
