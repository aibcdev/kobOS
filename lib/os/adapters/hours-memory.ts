import type { IntegrationAdapter, VerificationResult } from "@/lib/os/adapter";

export type HoursState = { open: string; close: string; closedDates?: string[] };

export function hoursEqual(a: HoursState, b: HoursState): boolean {
  const datesA = [...(a.closedDates ?? [])].sort().join(",");
  const datesB = [...(b.closedDates ?? [])].sort().join(",");
  return a.open === b.open && a.close === b.close && datesA === datesB;
}

export function createInMemoryHoursAdapter(initial: HoursState, opts?: { failExecute?: boolean; failVerify?: boolean; name?: string }): IntegrationAdapter & { snapshot: () => HoursState } {
  let state = { ...initial, closedDates: [...(initial.closedDates ?? [])] };
  const name = opts?.name ?? "hours";
  return {
    snapshot: () => ({ ...state, closedDates: [...(state.closedDates ?? [])] }),
    async authenticate() {
      return { ok: true };
    },
    async read() {
      return { ok: true, data: { ...state } };
    },
    async execute(action, payload) {
      if (opts?.failExecute) return { ok: false, reason: `${name} connection needs reconnecting.` };
      if (action === "SET_HOURS") {
        state = {
          open: String(payload.open ?? state.open),
          close: String(payload.close ?? state.close),
          closedDates: Array.isArray(payload.closedDates)
            ? (payload.closedDates as string[])
            : state.closedDates,
        };
        return { ok: true, payload: { ...state }, httpOkNotProof: true };
      }
      if (action === "TEMPORARY_CLOSURE") {
        const date = String(payload.date ?? "");
        const closedDates = [...new Set([...(state.closedDates ?? []), date])];
        state = { ...state, closedDates };
        return { ok: true, payload: { ...state }, httpOkNotProof: true };
      }
      return { ok: false, reason: "Unknown action" };
    },
    async verify(expected): Promise<VerificationResult> {
      if (opts?.failVerify) {
        return { ok: false, matchesExpected: false, observed: { ...state }, reason: "Could not read back." };
      }
      const observed = { ...state };
      if (Array.isArray(expected.closedDates) && expected.open === "keep") {
        const have = new Set(state.closedDates ?? []);
        const matches = (expected.closedDates as string[]).every((d) => have.has(String(d)));
        return {
          ok: matches,
          matchesExpected: matches,
          observed,
          reason: matches ? undefined : `${name} does not match yet.`,
        };
      }
      const expectedHours: HoursState = {
        open: String(expected.open ?? state.open),
        close: String(expected.close ?? state.close),
        closedDates: Array.isArray(expected.closedDates)
          ? (expected.closedDates as string[])
          : state.closedDates,
      };
      const matches = hoursEqual(state, expectedHours);
      return {
        ok: matches,
        matchesExpected: matches,
        observed,
        reason: matches ? undefined : `${name} does not match yet.`,
      };
    },
    async health() {
      return { ok: !opts?.failExecute, lastSuccessAt: new Date().toISOString() };
    },
  };
}
