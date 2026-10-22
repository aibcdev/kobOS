import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/app", label: "Talk" },
  { href: "/app/needs-you", label: "Needs you" },
  { href: "/app/activity", label: "Activity" },
  { href: "/app/roi", label: "Your week" },
  { href: "/app/settings/connections", label: "Connections" },
  { href: "/app/imports", label: "Imports" },
  { href: "/app/settings/permissions", label: "Settings" },
];

export function AppPageShell({
  title,
  subtitle,
  restaurantQuery,
  active,
  children,
}: {
  title: string;
  subtitle?: string;
  restaurantQuery: string;
  active?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-5 py-8">
      <nav aria-label="KOB" className="flex flex-wrap gap-2 text-sm">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={`${item.href}${restaurantQuery}`}
            aria-current={active === item.href ? "page" : undefined}
            className={
              active === item.href ? "rounded-full bg-espresso px-3 py-1.5 text-paper" : "rounded-full px-3 py-1.5 text-muted hover:text-espresso"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <header>
        <h1 className="font-display text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
      </header>
      {children}
    </main>
  );
}
