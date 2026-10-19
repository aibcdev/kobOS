import { redirect } from "next/navigation";
import { AppPageShell } from "@/components/actions/app-page-shell";
import { ConnectionsPanel } from "@/components/hub/connections-panel";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { connectionsView } from "@/lib/hub/connections";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await loadOwnerContext(params.r);
  if (ctx.kind === "signed-out") redirect("/login?next=%2Fapp%2Fsettings%2Fconnections");
  if (ctx.kind === "no-restaurant") redirect("/app");
  const restaurantQuery = typeof params.r === "string" ? `?r=${encodeURIComponent(params.r)}` : "";
  const view = await connectionsView(ctx.restaurant.id);
  const connected = typeof params.connected === "string" ? params.connected : null;
  const error = typeof params.connectionError === "string" ? params.connectionError : null;

  return (
    <AppPageShell title="Connections" subtitle={ctx.restaurant.name} restaurantQuery={restaurantQuery} active="/app/settings/connections">
      <ConnectionsPanel
        restaurantId={ctx.restaurant.id}
        cards={view.cards}
        capabilities={view.capabilities}
        canManage={ctx.role === "OWNER" || ctx.role === "ADMIN"}
        timeZone={ctx.restaurant.timezone}
        importsHref={`/app/imports${restaurantQuery}`}
        notice={error ? { kind: "error", text: error } : connected ? { kind: "ok", text: "Connected. KOB is pulling your history now." } : null}
      />
    </AppPageShell>
  );
}
