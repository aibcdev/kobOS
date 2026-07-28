"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DASHBOARD_NAV_ACCOUNT, withRestaurantQuery } from "@/lib/dashboard/nav";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function DashboardAccountMenu({
  email,
  restaurantId = null,
}: {
  email?: string | null;
  restaurantId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-[var(--color-muted)] hover:bg-white hover:text-[var(--color-ink)]"
      >
        <span className="max-w-[160px] truncate">{email ?? "Account"}</span>
        <span aria-hidden className="text-[9px]">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-white py-1 shadow-lg">
          {DASHBOARD_NAV_ACCOUNT.map((item) => (
            <Link
              key={item.id}
              href={withRestaurantQuery(item.href, restaurantId)}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-[13px] text-[var(--color-ink)] no-underline hover:bg-[var(--color-surface-warm)]"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void signOut()}
            className="block w-full border-t border-[var(--color-hairline)] px-3 py-2 text-left text-[13px] text-[var(--color-muted)] hover:bg-[var(--color-surface-warm)] hover:text-[var(--color-ink)]"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
