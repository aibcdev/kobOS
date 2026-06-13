"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useCallback, useEffect, useRef, useState } from "react";

export type ScanMapCompetitor = {
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  lat: number;
  lng: number;
  competitors?: ScanMapCompetitor[];
  compact?: boolean;
};

/** Live JS Maps when key is set; otherwise server static map proxy. */
export function AuditScanningMap({ lat, lng, competitors = [], compact = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const jsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const [staticFailed, setStaticFailed] = useState(false);
  const minH = compact ? "min-h-[140px]" : "min-h-[280px]";

  const init = useCallback(async () => {
    const key = jsKey;
    const el = ref.current;
    if (!key || !el) return;

    setOptions({ key, v: "weekly" });
    const mapsLib = await importLibrary("maps");
    const center = { lat, lng };
    const map = new mapsLib.Map(el, {
      center,
      zoom: compact ? 15 : 14,
      disableDefaultUI: true,
      zoomControl: !compact,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    new google.maps.Marker({
      position: center,
      map,
      title: "Your restaurant",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: compact ? 8 : 10,
        fillColor: "#094413",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });

    for (const c of competitors.slice(0, 4)) {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
      new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map,
        title: c.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: compact ? 7 : 9,
          fillColor: "#c9a227",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    }
  }, [competitors, compact, jsKey, lat, lng]);

  useEffect(() => {
    if (!jsKey) return;
    let cancelled = false;
    void (async () => {
      try {
        if (cancelled) return;
        await init();
      } catch (e) {
        console.warn("[AuditScanningMap]", e);
        setStaticFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [init, jsKey]);

  if (jsKey && !staticFailed) {
    return <div ref={ref} className={`h-full w-full overflow-hidden ${minH}`} />;
  }

  if (staticFailed) {
    return (
      <div
        className={`flex h-full ${minH} flex-col items-center justify-center bg-[var(--color-surface-warm)] p-4 text-center text-xs text-[var(--color-muted)]`}
      >
        Map preview unavailable
      </div>
    );
  }

  const staticSrc = `/api/places/static-map?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&w=640&h=480`;

  return (
    <div className={`relative h-full w-full overflow-hidden ${minH}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={staticSrc}
        alt={`Map centered on ${lat.toFixed(4)}, ${lng.toFixed(4)}`}
        className="h-full w-full object-cover"
        onError={() => setStaticFailed(true)}
      />
      {!compact
        ? competitors.slice(0, 2).map((c, i) => (
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
          ))
        : null}
    </div>
  );
}
