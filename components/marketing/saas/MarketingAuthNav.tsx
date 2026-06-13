"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function MarketingAuthNav({ onNavigate, mobile }: { onNavigate?: () => void; mobile?: boolean }) {
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
      <div className={`${mobile ? "flex" : "hidden sm:block"} h-9 w-28 animate-pulse rounded-full bg-[#2c2c2c]/5`} aria-hidden />
    );
  }

  if (signedIn) {
    return (
      <div className={wrap}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={`text-sm font-medium text-[#094413] underline-offset-4 transition-colors hover:underline ${mobile ? "rounded-full border border-[#2c2c2c]/10 py-2 text-center" : ""}`}
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className={`text-sm font-medium text-[#2c2c2c]/70 transition-colors hover:text-[#094413] ${mobile ? "rounded-full py-2 text-center" : ""}`}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <Link
        href="/login"
        onClick={onNavigate}
        className={`text-sm font-medium text-[#2c2c2c]/80 transition-colors hover:text-[#094413] ${mobile ? "rounded-full border border-[#2c2c2c]/10 py-2 text-center" : ""}`}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        onClick={onNavigate}
        className={`text-sm font-medium text-[#094413] underline-offset-4 transition-colors hover:underline ${mobile ? "rounded-full bg-[#094413] py-2 text-center text-[#fbf8f5] hover:bg-[#088924]" : ""}`}
      >
        Sign up
      </Link>
    </div>
  );
}
