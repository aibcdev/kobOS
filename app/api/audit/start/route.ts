import { handleAuditStart } from "@/lib/audit/audit-start-shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleAuditStart(req);
}
