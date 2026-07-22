import { CreditLedgerReason, type SubscriptionPlan } from "@prisma/client";
import { monthlyCreditGrant } from "@/lib/credits/catalog";
import { prisma } from "@/lib/db/prisma";

function sameUtcMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/**
 * Ensure paid plans receive their monthly credit allotment once per month.
 * Free plans stay at 0 unless manually adjusted.
 */
export async function ensureMonthlyCredits(restaurantId: string): Promise<{
  creditBalance: number;
  granted: number;
}> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      subscriptionPlan: true,
      creditBalance: true,
      creditsRefreshedAt: true,
    },
  });
  if (!restaurant) {
    return { creditBalance: 0, granted: 0 };
  }

  const grant = monthlyCreditGrant(restaurant.subscriptionPlan as SubscriptionPlan);
  if (grant <= 0) {
    return { creditBalance: restaurant.creditBalance, granted: 0 };
  }

  const now = new Date();
  if (restaurant.creditsRefreshedAt && sameUtcMonth(restaurant.creditsRefreshedAt, now)) {
    return { creditBalance: restaurant.creditBalance, granted: 0 };
  }

  const balanceAfter = restaurant.creditBalance + grant;
  await prisma.$transaction([
    prisma.restaurant.update({
      where: { id: restaurantId },
      data: { creditBalance: balanceAfter, creditsRefreshedAt: now },
    }),
    prisma.creditLedgerEntry.create({
      data: {
        restaurantId,
        delta: grant,
        balanceAfter,
        reason: CreditLedgerReason.MONTHLY_GRANT,
        note: `Monthly ${restaurant.subscriptionPlan} allotment`,
      },
    }),
  ]);

  return { creditBalance: balanceAfter, granted: grant };
}

export async function spendCredits(args: {
  restaurantId: string;
  amount: number;
  note: string;
  requestId?: string;
}): Promise<{ ok: true; balanceAfter: number } | { ok: false; error: string; balance: number }> {
  if (args.amount <= 0) return { ok: false, error: "Invalid amount", balance: 0 };

  return prisma.$transaction(async (tx) => {
    const row = await tx.restaurant.findUnique({
      where: { id: args.restaurantId },
      select: { creditBalance: true },
    });
    if (!row) return { ok: false as const, error: "Restaurant not found", balance: 0 };
    if (row.creditBalance < args.amount) {
      return {
        ok: false as const,
        error: "Not enough credits",
        balance: row.creditBalance,
      };
    }
    const balanceAfter = row.creditBalance - args.amount;
    await tx.restaurant.update({
      where: { id: args.restaurantId },
      data: { creditBalance: balanceAfter },
    });
    await tx.creditLedgerEntry.create({
      data: {
        restaurantId: args.restaurantId,
        delta: -args.amount,
        balanceAfter,
        reason: CreditLedgerReason.SERVICE_REQUEST,
        note: args.note,
        requestId: args.requestId,
      },
    });
    return { ok: true as const, balanceAfter };
  });
}
