import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditDbUnavailable } from "@/components/marketing/audit/AuditDbUnavailable";
import { AuditScanningExperience } from "@/components/marketing/audit/AuditScanningExperience";
import { findVisibilityAuditIdOrSlugSelect } from "@/lib/audit/find-audit-by-id-or-slug";
import { isPrismaDbUnreachableError } from "@/lib/db/prisma-errors";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const audit = await findVisibilityAuditIdOrSlugSelect(id, { restaurantName: true });
    if (!audit) return { title: "Scanning · KOB" };
    return { title: `Scanning ${audit.restaurantName} · KOB` };
  } catch (e) {
    if (isPrismaDbUnreachableError(e)) return { title: "Scanning · KOB" };
    throw e;
  }
}

export default async function AuditScanningPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  let audit;
  try {
    audit = await findVisibilityAuditIdOrSlugSelect(id, {
      id: true,
      restaurantName: true,
      websiteUrl: true,
      city: true,
      slug: true,
    });
  } catch (e) {
    if (isPrismaDbUnreachableError(e)) {
      return (
        <div className="min-h-screen bg-[var(--color-surface-cream)]">
          <AuditDbUnavailable />
        </div>
      );
    }
    throw e;
  }
  if (!audit) notFound();

  return (
    <AuditScanningExperience
      auditId={audit.id}
      initialName={audit.restaurantName}
      initialWebsiteUrl={audit.websiteUrl ?? ""}
      initialCity={audit.city}
      resultPathKey={audit.slug || audit.id}
      initialEmail={sp.email?.trim() || null}
    />
  );
}
