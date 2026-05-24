import Link from "next/link";
import { Suspense } from "react";

import { marketingCopy } from "@/lib/marketing/copy";

import { SaasAuthForm } from "./SaasAuthForm";

export function SaasAuthPage({ defaultMode = "signin" }: { defaultMode?: "signin" | "signup" }) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f9f3ed] px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Link href="/" className="text-sm text-[#2c2c2c]/60 hover:text-[#094413]">
            ← Back to home
          </Link>
          <p className="font-mono-brand mt-8 text-xs font-semibold uppercase tracking-wider text-[#088924]">KOB</p>
          <h1 className="font-heading mt-4 text-3xl font-semibold tracking-tight text-[#2c2c2c] md:text-4xl">
            Your growth workspace starts here
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#2c2c2c]/75 md:text-base">{marketingCopy.trustLine}</p>
          <ul className="mt-8 space-y-3 text-sm text-[#2c2c2c]/80">
            <li>✓ Free AI visibility scan</li>
            <li>✓ Growth Agent priorities each week</li>
            <li>✓ Website, ordering, and marketing in one place</li>
          </ul>
        </div>
        <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-[#2c2c2c]/5" />}>
          <SaasAuthForm defaultMode={defaultMode} />
        </Suspense>
      </div>
    </div>
  );
}
