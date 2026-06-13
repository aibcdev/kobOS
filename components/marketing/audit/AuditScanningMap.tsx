"use client";

import { useState } from "react";

export type ScanMapCompetitor = {
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  lat: number;
  lng: number;
  competitors?: ScanMapCompetitor[];
};

/** Server-rendered static map for audit scanning (uses GOOGLE_PLACES_API_KEY server-side). */
export function AuditScanningMap({ lat, lng, competitors = [] }: Props) {
  const [staticFailed, setStaticFailed] = useState(false);

  if (staticFailed) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#2c2c2c]/10 bg-[#f6f4f0] p-8 text-center text-sm text-[#666666]">
        Map preview unavailable
      </div>
    );
  }

  const staticSrc = `/api/places/static-map?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&w=640&h=480`;

  return (
    <div className="relative h-full min-h-[280px] w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered Google Static Maps proxy */}
      <img
        src={staticSrc}
        alt={`Map centered on ${lat.toFixed(4)}, ${lng.toFixed(4)}`}
        className="h-full w-full object-cover"
        onError={() => setStaticFailed(true)}
      />
      {competitors.slice(0, 2).map((c, i) => (
        <span
          key={c.name}
          className="pointer-events-none absolute max-w-[120px] truncate rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold shadow-sm"
          style={{
            bottom: `${20 + (i % 2) * 36}px`,
            left: i % 2 === 0 ? "1.5rem" : undefined,
            right: i % 2 === 1 ? "1.5rem" : undefined,
          }}
        >
          {c.name}
        </span>
      ))}
    </div>
  );
}
