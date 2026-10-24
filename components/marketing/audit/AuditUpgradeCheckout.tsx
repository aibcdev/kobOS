"use client";

import { FREE_TRIAL_LABEL } from "@/lib/billing/offer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuditUpgradeCheckout({
  auditId,
  restaurantName,
  city,
  leadEmail,
}: {
  auditId: string;
  restaurantName: string;
  city: string;
  leadEmail: string | null;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "redirecting" | "failed">("checking");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const sessionEmail = data.session?.user?.email?.trim().toLowerCase();

      if (!data.session) {
        const emailParam = leadEmail ? `&email=${encodeURIComponent(leadEmail)}` : "";
        router.replace(`/login?next=${encodeURIComponent(`/audit/${auditId}/upgrade/checkout`)}${emailParam}`);
        return;
      }

      if (leadEmail && sessionEmail && leadEmail.toLowerCase() !== sessionEmail) {
        setError(
          `Sign in as ${leadEmail} (the email you used to unlock this report), or run a new audit with ${sessionEmail}.`,
        );
        setStatus("failed");
        return;
      }

      setStatus("redirecting");
      try {
        const res = await fetch("/api/trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantName,
            city: city || null,
            visibilityAuditId: auditId,
          }),
        });
        const body = (await res.json()) as { error?: string; restaurantId?: string; nextHref?: string };
        if (!res.ok || !body.restaurantId) {
          setError(body.error ?? "Could not start your trial. Try again.");
          setStatus("failed");
          return;
        }
        // No card and no checkout: the trial starts on the restaurant and the owner lands in it.
        window.location.href = body.nextHref ?? `/app?r=${encodeURIComponent(body.restaurantId)}`;
      } catch {
        setError("Network error — try again.");
        setStatus("failed");
      }
    })();
  }, [auditId, restaurantName, city, leadEmail, router]);

  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      {status === "checking" || status === "redirecting" ? (
        <>
          <span
            className="mx-auto inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#094413]/20 border-t-[#094413]"
            aria-hidden
          />
          <p className="mt-6 text-lg font-medium text-[#2c2c2c]">
            {status === "checking" ? "Confirming your account…" : "Starting your free trial…"}
          </p>
          <p className="mt-2 text-sm text-[#666666]">{FREE_TRIAL_LABEL} for {restaurantName}</p>
        </>
      ) : null}
      {error ? (
        <>
          <p className="text-sm text-red-800" role="alert">
            {error}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/audit/${auditId}/upgrade`}
              className="text-sm font-medium text-[#094413] underline underline-offset-2"
            >
              Back to upgrade
            </Link>
            <Link href={`/audit/${auditId}`} className="text-sm text-[#666666] underline underline-offset-2">
              View audit results
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
