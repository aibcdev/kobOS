import { redirect } from "next/navigation";
import { AppPageShell } from "@/components/actions/app-page-shell";
import { GrantList, type GrantRow } from "@/components/permissions/grant-list";
import { actionLabel } from "@/lib/agent/action-labels";
import { activeGrants } from "@/lib/agent/grants";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const MODE_TEXT: Record<string, string> = {
  NEVER: "Never — KOB won't suggest this",
  ASK: "Asks you first",
  AUTO_WITH_LIMITS: "Does it within your limits",
  AUTOPILOT: "Autopilot",
};

function limitText(limits: unknown): string[] {
  const l = (limits ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  if (typeof l.minRating === "number") out.push(`${l.minRating}★ and up`);
  if (typeof l.maxPerDay === "number") out.push(`up to ${l.maxPerDay} a day`);
  if (typeof l.excludeSeverityGte === "number") out.push("skips sensitive reviews");
  return out;
}

export default async function PermissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await loadOwnerContext(params.r);
  if (ctx.kind === "signed-out") redirect("/login?next=%2Fapp%2Fsettings%2Fpermissions");
  if (ctx.kind === "no-restaurant") redirect("/app");
  const restaurantQuery = typeof params.r === "string" ? `?r=${encodeURIComponent(params.r)}` : "";

  const [grants, modes] = await Promise.all([
    activeGrants(ctx.restaurant.id),
    prisma.osActionPermission.findMany({ where: { restaurantId: ctx.restaurant.id }, orderBy: { actionType: "asc" } }),
  ]);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: ctx.restaurant.timezone, dateStyle: "medium", timeStyle: "short" });
  const rows = (scope: "TASK" | "ALWAYS"): GrantRow[] =>
    grants
      .filter((g) => g.scope === scope)
      .map((g) => ({
        id: g.id,
        label: actionLabel(g.actionType),
        scope,
        limits: limitText(g.limitsJson),
        grantedAt: fmt.format(g.grantedAt),
        expiresAt: g.expiresAt ? fmt.format(g.expiresAt) : null,
      }));

  return (
    <AppPageShell title="Permissions" subtitle={ctx.restaurant.name} restaurantQuery={restaurantQuery} active="/app/settings/permissions">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Always do this</h2>
        <GrantList grants={rows("ALWAYS")} empty="Nothing runs without asking you. Tap “Always do this” on a card to change that." />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">For a task</h2>
        <GrantList grants={rows("TASK")} empty="No task approvals open." />
      </section>
      {modes.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Current settings</h2>
          <ul className="divide-y divide-line rounded-3xl border border-line bg-paper text-sm">
            {modes.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 p-4">
                <span>{actionLabel(m.actionType)}</span>
                <span className="text-muted">{MODE_TEXT[m.mode] ?? m.mode}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppPageShell>
  );
}
