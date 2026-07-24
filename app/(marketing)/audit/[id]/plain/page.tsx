import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditDbUnavailable } from "@/components/marketing/audit/AuditDbUnavailable";
import { AuditPlainDocument } from "@/components/marketing/audit/AuditPlainDocument";
import { findVisibilityAuditByIdOrSlug } from "@/lib/audit/find-audit-by-id-or-slug";
import { parseAuditPayload } from "@/lib/audit/types";
import { isPrismaDbUnreachableError } from "@/lib/db/prisma-errors";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const audit = await findVisibilityAuditByIdOrSlug(id);
    if (!audit) return { title: "Audit · KOB" };
    const pathKey = audit.slug || audit.id;
    const url = `https://trykob.com/audit/${pathKey}/plain`;
    return {
      title: `${audit.restaurantName} · Audit (simple view) · KOB`,
      description: `Public visibility audit for ${audit.restaurantName} in ${audit.city}. No login required.`,
      robots: { index: true, follow: true },
      openGraph: {
        title: `${audit.restaurantName} · KOB audit`,
        description: `Growth score and recommended fixes for ${audit.restaurantName}. Open without logging in.`,
        url,
        siteName: "KOB",
        type: "article",
        locale: "en_GB",
      },
      twitter: {
        card: "summary",
        title: `${audit.restaurantName} · KOB audit`,
        description: `Public audit — no login required.`,
      },
      alternates: { canonical: url },
    };
  } catch (e) {
    if (isPrismaDbUnreachableError(e)) return { title: "Audit · KOB" };
    throw e;
  }
}

/** Plain HTML audit — readable by browsers and tools that struggle with the interactive dashboard. */
export default async function AuditPlainPage({ params }: Props) {
  const { id } = await params;
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

  return (
    <div className="min-h-screen bg-[var(--color-surface-cream,#f9f3ed)]">
      <div className="border-b border-[var(--color-hairline)] bg-white px-5 py-4 md:px-8">
        <a href="/" className="font-head text-lg font-semibold text-[var(--color-ink)] no-underline">
          KOB
        </a>
      </div>
      <AuditPlainDocument
        restaurantName={audit.restaurantName}
        city={audit.city}
        websiteUrl={audit.websiteUrl}
        payload={payload}
        interactiveHref={`/audit/${pathKey}`}
      />
    </div>
  );
}
