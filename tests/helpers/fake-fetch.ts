import { readFileSync } from "node:fs";
import path from "node:path";

export type FakeCall = { method: string; url: string; headers: Record<string, string>; body: unknown };
/** `text` answers with a raw body (e.g. a web page) instead of JSON. */
type Reply = { status?: number; json?: unknown; text?: string; headers?: Record<string, string> };
type Route = { method?: string; match: RegExp; reply: Reply | ((call: FakeCall) => Reply) };

/** Loads a recorded fixture next to a connector: fixture("square", "locations.json"). */
export function fixture<T = unknown>(connector: string, file: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), "lib/connectors", connector, "fixtures", file), "utf8")) as T;
}

/** A `fetch` that answers from routes (first match wins), records every call and fails loudly on anything unrouted. */
export function fakeFetch(routes: Route[]) {
  const calls: FakeCall[] = [];
  const fn = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = (init.method ?? "GET").toUpperCase();
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    let body: unknown = init.body ?? null;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // form bodies stay strings
      }
    } else if (body instanceof URLSearchParams) body = Object.fromEntries(body.entries());
    const call = { method, url, headers, body };
    calls.push(call);
    const route = routes.find((r) => (!r.method || r.method === method) && r.match.test(url));
    if (!route) throw new Error(`Unrouted ${method} ${url}`);
    const reply = typeof route.reply === "function" ? route.reply(call) : route.reply;
    if (reply.text !== undefined)
      return new Response(reply.text, { status: reply.status ?? 200, headers: { "Content-Type": "text/html", ...(reply.headers ?? {}) } });
    return new Response(JSON.stringify(reply.json ?? {}), {
      status: reply.status ?? 200,
      headers: { "Content-Type": "application/json", ...(reply.headers ?? {}) },
    });
  }) as typeof fetch;
  return { fetch: fn, calls };
}
