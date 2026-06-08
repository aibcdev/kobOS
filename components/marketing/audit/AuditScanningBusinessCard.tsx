import { AuditScanningMap } from "@/components/marketing/audit/AuditScanningMap";
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
}: {
  restaurantName: string;
  city: string;
  lat: number;
  lng: number;
  rating?: number | null;
  reviewCount?: number | null;
  photoUrl?: string | null;
}) {
  const name = decodeHtmlEntities(restaurantName);
  const hasRating = rating != null && Number.isFinite(rating);
  const ratingLabel = hasRating
    ? `${rating!.toFixed(1)}${reviewCount != null ? ` · ${reviewCount} reviews` : ""}`
    : reviewCount != null
      ? `${reviewCount} reviews`
      : "Restaurant";

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
      <div className="grid grid-cols-2 gap-0">
        <div className="relative flex min-h-[140px] items-center justify-center overflow-hidden bg-[var(--color-surface-beige)]">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="text-5xl" aria-hidden>
              🍽
            </span>
          )}
        </div>
        <div className="relative min-h-[140px]">
          <AuditScanningMap lat={lat} lng={lng} />
        </div>
      </div>
      <div className="border-t border-[var(--color-hairline)] px-5 py-4">
        <p className="type-title-md">{name}</p>
        <p className="type-body-sm mt-1 text-[var(--color-muted)]">{city}</p>
        <p
          className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--color-warning)]"
          aria-label={hasRating ? `${rating} star rating` : "Google Business Profile"}
        >
          <span className="text-[var(--color-warning)]" aria-hidden>
            {starDisplay(rating)}
          </span>
          <span className="text-[var(--color-muted-medium)]">{ratingLabel}</span>
        </p>
      </div>
    </div>
  );
}
