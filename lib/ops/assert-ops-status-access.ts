import { NextResponse } from "next/server";

/**
 * Public status recon endpoints — open in development; require Bearer CRON_SECRET
 * (or OPS_STATUS_SECRET) in production.
 */
export function assertOpsStatusAccess(req: Request): NextResponse | null {
  if (process.env.NODE_ENV === "development") return null;

  const secret =
    process.env.OPS_STATUS_SECRET?.trim() || process.env.CRON_SECRET?.trim() || "";
  if (!secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const auth = req.headers.get("authorization")?.trim() ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
