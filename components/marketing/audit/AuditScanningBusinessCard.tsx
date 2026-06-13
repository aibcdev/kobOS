import { AuditScanningMap, type ScanMapCompetitor } from "@/components/marketing/audit/AuditScanningMap";
import { decodeHtmlEntities } from "@/lib/marketing/decode-html-entities";

function starDisplay(rating: number | null | undefined): string {
  if (rating == null || !Number.isFinite(rating)) return "★★★★";
  const full = Math.round(rating);
  return "★".repeat(Math.min(5, Math.max(1, full))) + "☆".repeat(Math.max(0, 5 - full));
}

export function AuditScanningBusinessCard({
  restaurantName,
  city,
  lat,
  lng,
  rating,
  reviewCount,
  photoUrl,
  categoryLine,
  statusLine,
  competitors = [],
}: {
  restaurantName: string;
  city: string;
  lat: number;
  lng: number;
  rating?: number | null;
  reviewCount?: number | null;
  photoUrl?: string | null;
  categoryLine?: string | null;
  statusLine?: string | null;
  competitors?: ScanMapCompetitor[];
}) {
  const name = decodeHtmlEntities(restaurantName);
  const hasRating = rating != null && Number.isFinite(rating);
  const ratingValue = hasRating ? rating!.toFixed(1) : null;

  return (
    <div className="mx-auto w-full max-w-lg overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
      <div className="grid grid-cols-2 gap-0">
        <div className="relative flex min-h-[160px] items-center justify-center overflow-hidden bg-[var(--color-surface-beige)]">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="text-5xl" aria-hidden>
              🍽
            </span>
          )}
        </div>
        <div className="relative min-h-[160px]">
          <AuditScanningMap lat={lat} lng={lng} competitors={competitors} compact />
        </div>
      </div>
      <div className="border-t border-[var(--color-hairline)] px-5 py-4">
        <p className="type-title-md">{name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[var(--color-warning)]" aria-hidden>
            {starDisplay(rating)}
          </span>
          {ratingValue ? (
            <span className="type-body-sm font-medium text-[var(--color-ink)]">{ratingValue}</span>
          ) : null}
          {categoryLine ? (
            <span className="type-body-sm text-[var(--color-muted-medium)]">| {categoryLine}</span>
          ) : city ? (
            <span className="type-body-sm text-[var(--color-muted-medium)]">| {city}</span>
          ) : null}
        </div>
        {statusLine ? (
          <p className="type-body-sm mt-3 flex items-start gap-2 text-[var(--color-muted)]">
            <span className="text-[var(--color-warning)]" aria-hidden>
              ⚠
            </span>
            {statusLine}
          </p>
        ) : null}
        {reviewCount != null && reviewCount > 0 ? (
          <p className="type-caption mt-2 text-[var(--color-muted-medium)]">{reviewCount} Google reviews</p>
        ) : null}
      </div>
    </div>
  );
}
