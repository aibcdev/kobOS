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
    const pathKey = audit.slug || audit.id;
    const url = `https://trykob.com/audit/${pathKey}`;
    const plainUrl = `${url}/plain`;
    return {
      title: `${audit.restaurantName} · Visibility ${audit.overallScore} · KOB`,
      description: `Public visibility audit for ${audit.restaurantName} in ${audit.city}. No login required.`,
      robots: { index: true, follow: true },
      openGraph: {
        title: `${audit.restaurantName} · KOB audit`,
        description: `Growth score ${audit.overallScore}/100 for ${audit.restaurantName}. Open without logging in.`,
        url: plainUrl,
        siteName: "KOB",
        type: "article",
        locale: "en_GB",
      },
      twitter: {
        card: "summary",
        title: `${audit.restaurantName} · KOB audit`,
        description: `Public audit — no login required. Simple view: ${plainUrl}`,
      },
      alternates: {
        canonical: url,
        types: {
          "text/html": plainUrl,
        },
      },
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
  const pathKeyForLinks = audit.slug || audit.id;
  return (
    <>
      <div className="border-b border-[var(--color-hairline)] bg-white px-5 py-2.5 text-center text-sm text-[var(--color-muted)] md:px-8">
        Public report · no login needed ·{" "}
        <a href={`/audit/${pathKeyForLinks}/plain`} className="font-medium text-[var(--color-primary)] underline">
          Simple text view (best for sharing)
        </a>
      </div>
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
    </>
  );
}
