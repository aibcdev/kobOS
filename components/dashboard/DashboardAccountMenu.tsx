"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function DashboardAccountMenu({ email }: { email?: string | null }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      {email ? (
        <span className="type-caption hidden max-w-[140px] truncate text-[var(--color-muted)] sm:inline">
          {email}
        </span>
      ) : null}
      <Link
        href="/dashboard/settings"
        className="type-caption text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-ink)]"
      >
        Settings
      </Link>
      <button
        type="button"
        onClick={() => void signOut()}
        className="type-caption text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-ink)]"
      >
        Sign out
      </button>
    </div>
  );
}
