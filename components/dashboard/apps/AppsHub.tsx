import Link from "next/link";
import { appCardSurface } from "@/lib/app-ui-classes";
import type { AppCounts } from "@/lib/dashboard/app-counts";
import { WORKSPACE_APP_CATEGORIES } from "@/lib/dashboard/workspace-apps";

function withR(restaurantId: string, path: string) {
  return `${path}?r=${encodeURIComponent(restaurantId)}`;
}

export function AppsHub({
  restaurantId,
  counts,
  pins,
}: {
  restaurantId: string;
  counts: AppCounts;
  pins: { id: string; title: string; description: string; href: string }[];
}) {
  return (
    <div className="mx-auto max-w-5xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Apps</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Everything to run marketing, socials, and sales — in one place.
      </p>

      {pins.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-title-sm">Built from chat</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pins.map((pin) => (
              <Link
                key={pin.id}
                href={withR(restaurantId, pin.href)}
                className={`${appCardSurface} no-underline transition-colors hover:border-[var(--color-muted-medium)]`}
              >
                <p className="font-medium text-[var(--color-ink)]">{pin.title}</p>
                <p className="type-caption mt-1 text-[var(--color-muted)]">{pin.description || "Custom shortcut"}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-10 space-y-10">
        {WORKSPACE_APP_CATEGORIES.map((cat) => (
          <section key={cat.id}>
            <div className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: cat.color }}
              >
                {cat.apps.length}
              </span>
              <h2 className="type-title-sm">{cat.title}</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cat.apps.map((app) => {
                const badge = app.countKey ? counts[app.countKey] : undefined;
                return (
                  <Link
                    key={app.slug}
                    href={withR(restaurantId, app.href)}
                    className={`${appCardSurface} no-underline transition-colors hover:border-[var(--color-muted-medium)]`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-[var(--color-ink)]">{app.title}</p>
                      {badge != null && badge > 0 ? (
                        <span className="type-caption shrink-0 rounded-full bg-[var(--color-surface-warm)] px-2 py-0.5 text-[var(--color-muted)]">
                          {badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="type-caption mt-1 text-[var(--color-muted)]">{app.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
