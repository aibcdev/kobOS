"use client";

import {
  formatDiscoverySummary,
  readStoredDiscovery,
  type AuditDiscoveryStored,
} from "@/lib/marketing/audit-discovery";

export function AuditDiscoveryToldUs({ discovery }: { discovery: unknown }) {
  const stored = readStoredDiscovery(discovery) as AuditDiscoveryStored | null;
  if (!stored) return null;
  const rows = formatDiscoverySummary(stored);

  return (
    <section className="rounded-2xl border border-[#2c2c2c]/10 bg-white px-5 py-5 md:px-6">
      <p className="font-mono-brand text-[11px] font-semibold uppercase tracking-wider text-[#088924]">
        What you told us
      </p>
      <p className="mt-1 text-sm text-[#2c2c2c]/65">
        We use this to prioritise the report and any follow-up email or call.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl bg-[#f9f3ed]/80 px-3.5 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#2c2c2c]/45">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-[#2c2c2c]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
