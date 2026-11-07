import { countedHosts, fromCountedHost, isBot, recordVisit, visitPath, visitSource } from "@/lib/marketing/visits";

export const runtime = "nodejs";

/** Page-view beacon from VisitBeacon. Always 204: the page never waits on it or learns why a view didn't count. */
export async function POST(req: Request) {
  const done = new Response(null, { status: 204 });
  const hosts = countedHosts();
  if (!fromCountedHost(req.headers.get("origin"), hosts) || isBot(req.headers.get("user-agent"))) return done;

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text()) as Record<string, unknown>;
  } catch {
    return done;
  }
  if (!body || typeof body !== "object") return done;
  const path = visitPath(body.path);
  if (!path) return done;
  const entry = body.entry === true;
  const source = visitSource({ entry, referrer: body.referrer, utmSource: body.utmSource }, hosts);

  try {
    await recordVisit(path, source, entry);
  } catch (e) {
    console.warn("[visit]", e);
  }
  return done;
}
