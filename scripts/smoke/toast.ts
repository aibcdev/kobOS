/**
 * Read-only Toast smoke test (no DB writes). Usage:
 *   TOAST_SMOKE_CLIENT_ID=… TOAST_SMOKE_CLIENT_SECRET=… TOAST_SMOKE_RESTAURANT_GUID=… [TOAST_API_BASE=https://ws-sandbox-api.eng.toasttab.com] \
 *   npx tsx scripts/smoke/toast.ts
 */
import { toastBase, toastConnector, toastDate } from "@/lib/connectors/toast/connector";
import { mapToastMenus, mapToastOrder, type ToastMenuGroup, type ToastOrder } from "@/lib/connectors/toast/map";
import { need, summarise } from "./_summary";

async function main() {
  const creds = { clientId: need("TOAST_SMOKE_CLIENT_ID"), clientSecret: need("TOAST_SMOKE_CLIENT_SECRET"), restaurantGuid: need("TOAST_SMOKE_RESTAURANT_GUID") };
  const check = await toastConnector.validateCredentials(creds);
  console.log("validateCredentials:", check.ok ? "ok" : check.error);
  if (!check.ok) process.exit(1);
  const login = (await (
    await fetch(`${toastBase()}/authentication/v1/authentication/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: creds.clientId, clientSecret: creds.clientSecret, userAccessType: "TOAST_MACHINE_CLIENT" }),
    })
  ).json()) as { token: { accessToken: string } };
  const headers = { Authorization: `Bearer ${login.token.accessToken}`, "Toast-Restaurant-External-ID": creds.restaurantGuid };
  const end = new Date();
  const q = new URLSearchParams({ startDate: toastDate(new Date(end.getTime() - 7 * 86_400_000)), endDate: toastDate(end), pageSize: "100" });
  const orders = (await (await fetch(`${toastBase()}/orders/v2/ordersBulk?${q}`, { headers })).json()) as ToastOrder[];
  const menus = (await (await fetch(`${toastBase()}/menus/v2/menus`, { headers })).json()) as { menus?: { menuGroups?: ToastMenuGroup[] }[] };
  const currency = process.env.TOAST_SMOKE_CURRENCY ?? "USD";
  summarise("Toast (last 7 days, first page)", orders.map((o) => mapToastOrder(o, currency)).filter((o) => o !== null), mapToastMenus(menus.menus ?? [], currency));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
