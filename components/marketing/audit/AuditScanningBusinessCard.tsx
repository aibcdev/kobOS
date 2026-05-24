import { AuditScanningMap } from "@/components/marketing/audit/AuditScanningMap";
import { decodeHtmlEntities } from "@/lib/marketing/decode-html-entities";

export function AuditScanningBusinessCard({
  restaurantName,
  city,
  lat,
  lng,
}: {
  restaurantName: string;
  city: string;
  lat: number;
  lng: number;
}) {
  const name = decodeHtmlEntities(restaurantName);

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
      <div className="grid grid-cols-2 gap-0">
        <div className="flex min-h-[140px] items-center justify-center bg-[var(--color-surface-beige)] text-5xl" aria-hidden>
          🍽
        </div>
        <div className="relative min-h-[140px]">
          <AuditScanningMap lat={lat} lng={lng} />
        </div>
      </div>
      <div className="border-t border-[var(--color-hairline)] px-5 py-4">
        <p className="type-title-md">{name}</p>
        <p className="type-body-sm mt-1 text-[var(--color-muted)]">{city}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--color-warning)]" aria-label="4.2 star rating">
          <span className="text-[var(--color-warning)]" aria-hidden>
            ★★★★
          </span>
          <span className="text-[var(--color-muted-medium)]">4.2 · Restaurant</span>
        </p>
      </div>
    </div>
  );
}
