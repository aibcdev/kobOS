"use client";

import { DashboardShell } from "@/components/dashboard/DashboardShell";

/** Local preview of Owner-mapped sidebar. Visit: /dev/owner-nav-preview */
export default function OwnerNavPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center">
        <p>Dev preview only.</p>
      </main>
    );
  }

  return (
    <DashboardShell
      restaurants={[{ id: "preview", name: "Coastal Kitchen", city: "Brighton" }]}
      userEmail="owner@coastalkitchen.example"
      salesMode={false}
    >
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-xs font-medium tracking-wide text-[var(--color-muted-medium)] uppercase">
          Preview
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">Owner-style navigation</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Left sidebar mirrors Owner.com: Grow online discovery, Grow online sales, plus KOB Today /
          Chat / Requests. Click items to open each surface.
        </p>
      </div>
    </DashboardShell>
  );
}
