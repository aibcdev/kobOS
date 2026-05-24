import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditDbUnavailable } from "@/components/marketing/audit/AuditDbUnavailable";
import { AuditScanningExperience } from "@/components/marketing/audit/AuditScanningExperience";
import { isPrismaDbUnreachableError } from "@/lib/db/prisma-errors";
import { prisma } from "@/lib/db/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const audit = await prisma.visibilityAudit.findUnique({
      where: { id },
      select: { restaurantName: true },
    });
    if (!audit) return { title: "Scanning · KOB" };
    return { title: `Scanning ${audit.restaurantName} · KOB` };
  } catch (e) {
    if (isPrismaDbUnreachableError(e)) return { title: "Scanning · KOB" };
    throw e;
  }
}

export default async function AuditScanningPage({ params }: Props) {
  const { id } = await params;
  let audit;
  try {
    audit = await prisma.visibilityAudit.findUnique({
      where: { id },
      select: { id: true, restaurantName: true, websiteUrl: true, city: true },
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
    />
  );
}
