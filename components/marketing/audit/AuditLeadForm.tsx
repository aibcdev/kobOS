"use client";

import { useRouter } from "next/navigation";
import { AuditLeadFormFields } from "@/components/marketing/audit/AuditLeadFormFields";

/** Inline unlock form (e.g. below blurred preview). */
export function AuditLeadForm({ auditId }: { auditId: string }) {
  const router = useRouter();
  return <AuditLeadFormFields auditId={auditId} onSuccess={() => router.refresh()} />;
}
