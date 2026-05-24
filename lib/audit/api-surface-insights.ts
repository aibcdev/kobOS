import type { AuditNetworkFact } from "@/lib/audit/network-capture";

/** browser-to-api style hints from in-process network capture during render. */
export type ApiSurfaceInsights = {
  apiCallCount: number;
  hasGraphql: boolean;
  hasMenuOrCatalogApi: boolean;
  hasOrderOrCartApi: boolean;
  hasLocationApi: boolean;
  samplePaths: string[];
};

const MENU_PATH = /\/(menu|menus|products|catalog|items|nutrition|offers)/i;
const ORDER_PATH = /\/(order|cart|checkout|basket|delivery|pickup)/i;
const LOCATION_PATH = /\/(locations?|stores?|restaurants?|find-a)/i;

export function insightsFromNetworkFacts(facts: AuditNetworkFact[] | null | undefined): ApiSurfaceInsights {
  const list = facts ?? [];
  const paths = list.map((f) => f.path).slice(0, 12);

  return {
    apiCallCount: list.length,
    hasGraphql: list.some((f) => f.path.includes("/graphql") || f.path.includes("graphql")),
    hasMenuOrCatalogApi: list.some((f) => MENU_PATH.test(f.path)),
    hasOrderOrCartApi: list.some((f) => ORDER_PATH.test(f.path)),
    hasLocationApi: list.some((f) => LOCATION_PATH.test(f.path)),
    samplePaths: paths,
  };
}
