import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { WebhookRequest } from "@/lib/hub/webhooks/types";

export function fixture(name: string): string {
  return readFileSync(join(process.cwd(), "lib/hub/webhooks/fixtures", name), "utf8").trim();
}

export function whReq(raw: string, headers: Record<string, string> = {}, extra: Partial<WebhookRequest> = {}): WebhookRequest {
  return { raw, headers: new Headers(headers), urls: ["https://trykob.com/api/webhooks/test"], now: new Date(), ...extra };
}
