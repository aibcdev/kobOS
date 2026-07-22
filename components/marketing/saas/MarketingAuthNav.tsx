"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function MarketingAuthNav({
  onNavigate,
  mobile,
  compact,
}: {
  onNavigate?: () => void;
  mobile?: boolean;
  /** Header mode: Sign in only (primary CTA is Run free scan). */
  compact?: boolean;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSignedIn(false);
    onNavigate?.();
    window.location.href = "/";
  }

  const wrap = mobile ? "flex flex-col gap-3" : "hidden items-center gap-4 sm:flex";

  if (signedIn === null) {
    return (
      <div className={`${mobile ? "flex" : "hidden sm:block"} h-9 w-20 animate-pulse rounded-full bg-[#2c2c2c]/5`} aria-hidden />
    );
  }

  if (signedIn) {
    return (
      <div className={wrap}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={`text-sm font-medium text-[var(--color-forest)] underline-offset-4 transition-colors hover:underline ${mobile ? "rounded-full border border-[#2c2c2c]/10 py-2 text-center" : ""}`}
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className={`text-sm font-medium text-[#2c2c2c]/70 transition-colors hover:text-[var(--color-forest)] ${mobile ? "rounded-full py-2 text-center" : ""}`}
        >
          Sign out
        </button>
      </div>
    );
  }

  if (compact && !mobile) {
    return (
      <div className="hidden items-center gap-4 sm:flex">
        <Link
          href="/login"
          onClick={onNavigate}
          className="text-sm font-medium text-[#2c2c2c]/80 transition-colors hover:text-[var(--color-forest)]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <Link
        href="/login"
        onClick={onNavigate}
        className={`text-sm font-medium text-[#2c2c2c]/80 transition-colors hover:text-[var(--color-forest)] ${mobile ? "rounded-full border border-[#2c2c2c]/10 py-2 text-center" : ""}`}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        onClick={onNavigate}
        className={`inline-flex items-center justify-center rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-forest)] ${mobile ? "w-full" : ""}`}
      >
        Get started
      </Link>
    </div>
  );
}
