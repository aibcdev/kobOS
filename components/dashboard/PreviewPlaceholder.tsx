import { appCardSurface } from "@/lib/app-ui-classes";

export function PreviewPlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-[var(--spacing-md)] py-10">
      <div className="mb-6 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-50/80 px-4 py-3 type-body-sm text-amber-950">
        <strong className="font-semibold">UI preview</strong> — no database. Set{" "}
        <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_UI_PREVIEW=1</code> locally.
        Remove it when Supabase + Postgres are connected.
      </div>
      <div className={appCardSurface}>
        <h1 className="type-title-md">{title}</h1>
        <p className="type-body-md mt-3 text-[var(--color-muted)]">
          {description ??
            "This screen loads live data from your workspace. Hook up Supabase and run migrations to see it here."}
        </p>
      </div>
    </div>
  );
}
