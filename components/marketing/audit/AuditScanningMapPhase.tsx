import { AuditScanningMap, type ScanMapCompetitor } from "@/components/marketing/audit/AuditScanningMap";
import { decodeHtmlEntities } from "@/lib/marketing/decode-html-entities";

export function AuditScanningMapPhase({
  restaurantName,
  city,
  lat,
  lng,
  competitors = [],
}: {
  restaurantName: string;
  city: string;
  lat: number;
  lng: number;
  competitors?: ScanMapCompetitor[];
}) {
  const name = decodeHtmlEntities(restaurantName);

  return (
    <div className="relative mx-auto h-[min(52vh,480px)] w-full max-w-2xl overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] shadow-[var(--shadow-card-elevated)]">
      <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3 shadow-sm">
        <span className="text-[var(--color-muted-medium)]" aria-hidden>
          ⌕
        </span>
        <span className="type-body-md min-w-0 flex-1 truncate font-medium text-[var(--color-ink)]">{name}</span>
        <span className="type-caption hidden truncate text-[var(--color-muted-medium)] sm:inline">{city}</span>
      </div>
      <div className="absolute inset-0">
        <AuditScanningMap lat={lat} lng={lng} competitors={competitors} />
      </div>
    </div>
  );
}
