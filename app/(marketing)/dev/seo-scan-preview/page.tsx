"use client";

import { AuditScanningSeoChecks } from "@/components/marketing/audit/AuditScanningSeoChecks";
import { AuditScanningSidebar } from "@/components/marketing/audit/AuditScanningSidebar";
import { AuditScanningWebsitePreview } from "@/components/marketing/audit/AuditScanningWebsitePreview";

/**
 * Local-only preview of the website SEO scan phase.
 * Visit: /dev/seo-scan-preview
 */
export default function SeoScanPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center">
        <p>This preview is only available in development.</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-warm)] text-[var(--color-ink)]">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:flex-row">
        <div className="w-full lg:w-[min(380px,36%)] lg:shrink-0">
          <AuditScanningSidebar
            phase="website"
            signals={{
              hasGeo: true,
              hasGooglePlace: true,
              hasPreviewImage: true,
              hasReviews: true,
              hasPhotos: true,
            }}
            restaurantName="Coastal Kitchen"
            websiteHost="coastalkitchen.example"
            progressPct={72}
            secondsRemaining={12}
          />
        </div>
        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:py-12">
          <p className="mb-4 text-center text-sm text-[var(--color-muted-medium)]">
            Checking SEO &amp; crawl signals
          </p>
          <div className="mx-auto w-full max-w-lg space-y-4">
            <AuditScanningWebsitePreview websiteUrl="https://coastalkitchen.example" />
            <AuditScanningSeoChecks
              checks={{
                title: true,
                meta: true,
                h1: true,
                schema: false,
                og: true,
                robots: true,
                sitemap: false,
                alts: false,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
