import { notFound, redirect } from "next/navigation";
import { ActionTimeline } from "@/components/actions/action-timeline";
import { AppPageShell } from "@/components/actions/app-page-shell";
import { ApprovalCard } from "@/components/kob-talk/cards/approval-card";
import { actionView } from "@/lib/agent/access";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function riskWord(risk: number): string {
  if (risk >= 76) return "High — confirm on the web";
  if (risk >= 51) return "Medium — slide to approve";
  return "Low";
}

export default async function ActionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const ctx = await loadOwnerContext(query.r);
  if (ctx.kind === "signed-out") redirect(`/login?next=${encodeURIComponent(`/app/actions/${id}`)}`);
  if (ctx.kind === "no-restaurant") redirect("/app");
  const restaurantQuery = typeof query.r === "string" ? `?r=${encodeURIComponent(query.r)}` : "";

  const action = await prisma.osAction.findFirst({
    where: { id, restaurantId: ctx.restaurant.id },
    include: { evidence: true, audits: { orderBy: { createdAt: "asc" } } },
  });
  if (!action) notFound();

  const view = actionView(action);
  const evidence = action.evidence.filter((e) => e.evidenceType !== "policy.subject");
  const before = action.rollbackPayload as Record<string, unknown> | null;

  return (
    <AppPageShell title={action.title} subtitle={ctx.restaurant.name} restaurantQuery={restaurantQuery}>
      <ApprovalCard action={view} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">What changes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {before ? (
            <pre className="overflow-x-auto rounded-2xl bg-bone p-3 text-xs" aria-label="Before">
              {JSON.stringify(before, null, 2)}
            </pre>
          ) : null}
          <pre className="overflow-x-auto rounded-2xl bg-bone p-3 text-xs" aria-label="After">
            {JSON.stringify(action.proposedPayload, null, 2)}
          </pre>
        </div>
        <p className="text-sm">
          Risk: <span className="font-medium">{riskWord(action.riskScore)}</span>
        </p>
      </section>

      {evidence.length ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted">Why</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {evidence.map((e) => (
              <li key={e.id}>
                {e.evidenceType} — {e.source}
                {typeof (e.valueJson as { note?: unknown })?.note === "string" ? `: ${(e.valueJson as { note: string }).note}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Timeline</h2>
        <ActionTimeline
          timezone={ctx.restaurant.timezone}
          events={action.audits.map((a) => ({
            id: a.id,
            kind: a.kind,
            createdAt: a.createdAt.toISOString(),
            payload: (a.payload ?? {}) as Record<string, unknown>,
          }))}
        />
      </section>
    </AppPageShell>
  );
}
