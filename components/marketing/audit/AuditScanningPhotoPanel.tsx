"use client";

/** Owner grader — photo quality step using real image candidates. */
export function AuditScanningPhotoPanel({
  imageUrls,
  photoCount,
}: {
  imageUrls: string[];
  photoCount?: number | null;
}) {
  const urls = imageUrls.slice(0, 4);
  const countLabel =
    photoCount != null && photoCount > 0
      ? `${photoCount} Google listing photo${photoCount === 1 ? "" : "s"}`
      : urls.length > 0
        ? `${urls.length} website image${urls.length === 1 ? "" : "s"} found`
        : "Checking photo quality";

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white p-4 shadow-sm">
      <p className="type-label-md font-medium text-[var(--color-ink)]">Photo quality and quantity</p>
      <p className="type-caption mt-1 text-[var(--color-muted-medium)]">{countLabel}</p>
      {urls.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${url}-${i}`}
              src={url}
              alt=""
              className="aspect-[4/3] w-full rounded-lg border border-[var(--color-hairline)] object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex aspect-[16/7] items-center justify-center rounded-lg bg-[var(--color-surface-warm)] text-sm text-[var(--color-muted)]">
          Scanning listing photos…
        </div>
      )}
    </div>
  );
}
