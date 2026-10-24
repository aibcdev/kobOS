import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivityList } from "@/components/actions/activity-list";
import { AppPageShell } from "@/components/actions/app-page-shell";
import { actionView } from "@/lib/agent/access";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await loadOwnerContext(params.r);
  if (ctx.kind === "signed-out") redirect("/login?next=%2Fapp%2Factivity");
  if (ctx.kind === "no-restaurant") redirect("/app");
  const restaurantQuery = typeof params.r === "string" ? `?r=${encodeURIComponent(params.r)}` : "";
  const connector = typeof params.connector === "string" ? params.connector : undefined;

  const [actions, connectors] = await Promise.all([
    prisma.osAction.findMany({
      where: { restaurantId: ctx.restaurant.id, status: { notIn: ["AWAITING_APPROVAL", "PROPOSED", "DETECTED"] }, ...(connector ? { connector } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { audits: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.osAction.findMany({
      where: { restaurantId: ctx.restaurant.id, connector: { not: null } },
      distinct: ["connector"],
      select: { connector: true },
    }),
  ]);

  const filterHref = (c?: string) => {
    const q = new URLSearchParams();
    if (typeof params.r === "string") q.set("r", params.r);
    if (c) q.set("connector", c);
    const s = q.toString();
    return `/app/activity${s ? `?${s}` : ""}`;
  };

  return (
    <AppPageShell title="Activity" subtitle={ctx.restaurant.name} restaurantQuery={restaurantQuery} active="/app/activity">
      {connectors.length > 1 ? (
        <nav aria-label="Filter by connection" className="flex flex-wrap gap-2 text-xs">
          <Link href={filterHref()} className={!connector ? "rounded-full bg-espresso px-3 py-1 text-paper" : "rounded-full border border-line px-3 py-1"}>
            All
          </Link>
          {connectors.map(({ connector: c }) => (
            <Link key={c} href={filterHref(c!)} className={connector === c ? "rounded-full bg-espresso px-3 py-1 text-paper" : "rounded-full border border-line px-3 py-1"}>
              {c}
            </Link>
          ))}
        </nav>
      ) : null}
      <ActivityList
        timezone={ctx.restaurant.timezone}
        restaurantQuery={restaurantQuery}
        items={actions.map((a) => ({
          action: actionView(a),
          connector: a.connector,
          lastEvent: a.audits[0]?.kind ?? "",
          at: (a.audits[0]?.createdAt ?? a.updatedAt).toISOString(),
        }))}
      />
    </AppPageShell>
  );
}
