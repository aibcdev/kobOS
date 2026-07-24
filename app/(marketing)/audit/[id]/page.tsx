import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuditDbUnavailable } from "@/components/marketing/audit/AuditDbUnavailable";
import { AuditResultsContent } from "@/components/marketing/audit/AuditResultsContent";
import { findVisibilityAuditByIdOrSlug } from "@/lib/audit/find-audit-by-id-or-slug";
import { parseAuditPayload } from "@/lib/audit/types";
import { isPrismaDbUnreachableError } from "@/lib/db/prisma-errors";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string; email?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const audit = await findVisibilityAuditByIdOrSlug(id);
    if (!audit) return { title: "Audit · KOB" };
    return {
      title: `${audit.restaurantName} · Visibility ${audit.overallScore} · KOB`,
      description: `Visibility audit for ${audit.restaurantName} in ${audit.city}.`,
    };
  } catch (e) {
    if (isPrismaDbUnreachableError(e)) return { title: "Audit · KOB" };
    throw e;
  }
}

export default async function AuditResultPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const previewEarly = sp.preview === "1";
  const prefillEmail = sp.email?.trim() || null;
  let audit;
  try {
    audit = await findVisibilityAuditByIdOrSlug(id);
  } catch (e) {
    if (isPrismaDbUnreachableError(e)) {
      return (
        <div className="min-h-screen bg-[#f9f3ed]">
          <AuditDbUnavailable />
        </div>
      );
    }
    throw e;
  }
  if (!audit) notFound();

  const payload = parseAuditPayload(audit.resultPayload);
  if (!payload) notFound();

  const pathKey = audit.slug || audit.id;
  if (payload.scanStatus === "pending" && !previewEarly) {
    const emailQs = prefillEmail ? `?email=${encodeURIComponent(prefillEmail)}` : "";
    redirect(`/audit/${pathKey}/scanning${emailQs}`);
  }

  // Full report is public — no lead unlock / payload strip.
  return (
    <AuditResultsContent
      scanStillRunning={previewEarly && payload.scanStatus === "pending"}
      initialEmail={prefillEmail}
      audit={{
        id: audit.id,
        restaurantName: audit.restaurantName,
        city: audit.city,
        websiteUrl: audit.websiteUrl,
        leadCapturedAt: audit.leadCapturedAt,
        leadEmail: audit.leadEmail,
        createdAt: audit.createdAt,
        overallScore: audit.overallScore,
        seoScore: audit.seoScore,
        designScore: audit.designScore,
        mobileScore: audit.mobileScore,
        conversionScore: audit.conversionScore,
        updatedAt: audit.updatedAt,
      }}
      payload={payload}
    />
  );
}
