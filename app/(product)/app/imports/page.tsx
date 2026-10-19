import { redirect } from "next/navigation";
import { AppPageShell } from "@/components/actions/app-page-shell";
import { ImportsPanel } from "@/components/hub/imports-panel";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { prisma } from "@/lib/db/prisma";
import { importView } from "@/lib/hub/imports/access";
import { inboundAddress } from "@/lib/hub/imports/inbound";

export const dynamic = "force-dynamic";

export default async function ImportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await loadOwnerContext(params.r);
  if (ctx.kind === "signed-out") redirect("/login?next=%2Fapp%2Fimports");
  if (ctx.kind === "no-restaurant") redirect("/app");
  const restaurantQuery = typeof params.r === "string" ? `?r=${encodeURIComponent(params.r)}` : "";
  const restaurantId = ctx.restaurant.id;

  const jobs = await prisma.importJob.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take: 50 });
  const inbound = process.env.IMPORT_INBOUND_SECRET?.trim()
    ? [
        { label: "Statements and exports", address: inboundAddress(restaurantId, "data") },
        { label: "Bookings", address: inboundAddress(restaurantId, "bookings") },
        { label: "Supplier invoices", address: inboundAddress(restaurantId, "invoices") },
      ]
    : [];

  return (
    <AppPageShell title="Imports" subtitle={ctx.restaurant.name} restaurantQuery={restaurantQuery} active="/app/imports">
      <ImportsPanel
        restaurantId={restaurantId}
        imports={jobs.map(importView)}
        inboundAddresses={inbound}
        canUndo={ctx.role === "OWNER" || ctx.role === "ADMIN"}
        timeZone={ctx.restaurant.timezone}
      />
    </AppPageShell>
  );
}
