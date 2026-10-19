import { redirect } from "next/navigation";
import { AppPageShell } from "@/components/actions/app-page-shell";
import { NeedsYouList } from "@/components/actions/needs-you-list";
import { actionView } from "@/lib/agent/access";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function NeedsYouPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await loadOwnerContext(params.r);
  if (ctx.kind === "signed-out") redirect("/login?next=%2Fapp%2Fneeds-you");
  if (ctx.kind === "no-restaurant") redirect("/app");
  const restaurantQuery = typeof params.r === "string" ? `?r=${encodeURIComponent(params.r)}` : "";

  const actions = await prisma.osAction.findMany({
    where: { restaurantId: ctx.restaurant.id, status: { in: ["AWAITING_APPROVAL", "PROPOSED"] } },
    // Riskiest first, then whatever expires soonest.
    orderBy: [{ riskScore: "desc" }, { expiresAt: "asc" }],
    take: 50,
  });

  return (
    <AppPageShell title="Needs you" subtitle={ctx.restaurant.name} restaurantQuery={restaurantQuery} active="/app/needs-you">
      <NeedsYouList actions={actions.map(actionView)} restaurantQuery={restaurantQuery} />
    </AppPageShell>
  );
}
