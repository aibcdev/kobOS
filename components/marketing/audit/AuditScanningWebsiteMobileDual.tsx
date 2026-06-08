import { AuditScanningMobileLaser } from "@/components/marketing/audit/AuditScanningMobileLaser";
import { AuditScanningWebsitePreview } from "@/components/marketing/audit/AuditScanningWebsitePreview";

/** Desktop browser + phone side-by-side during website/mobile scan phases. */
export function AuditScanningWebsiteMobileDual({
  websiteUrl,
  imageUrl,
}: {
  websiteUrl: string;
  imageUrl?: string | null;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      <div className="w-full flex-1">
        <AuditScanningWebsitePreview websiteUrl={websiteUrl} imageUrl={imageUrl} />
      </div>
      <div className="shrink-0">
        <AuditScanningMobileLaser imageUrl={imageUrl} />
      </div>
    </div>
  );
}
