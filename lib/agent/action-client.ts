import type { ActionView } from "@/lib/agent/access";

export type ApproveScope = "ONCE" | "TASK" | "ALWAYS";

/** Statuses the card keeps polling through. */
export const ACTIVE_STATUSES = new Set(["APPROVED", "EXECUTING", "EXECUTED", "VERIFYING"]);

async function call(path: string, body?: unknown): Promise<{ ok: boolean; action?: ActionView; error?: string; code?: string }> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { action?: ActionView; error?: string; code?: string };
  return { ok: res.ok, ...json };
}

export const actionsApi = {
  get: (id: string) => call(`/api/actions/${id}`),
  approve: (id: string, input: { scope: ApproveScope; limits?: Record<string, number>; confirm?: "slide" }) =>
    call(`/api/actions/${id}/approve`, input),
  reject: (id: string, reason: string) => call(`/api/actions/${id}/reject`, { reason }),
  undo: (id: string) => call(`/api/actions/${id}/undo`, {}),
};
