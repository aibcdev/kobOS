import Link from "next/link";
import { redirect } from "next/navigation";

import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { isOperatorEmail } from "@/lib/ops/is-operator";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await getDashboardPageUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });
  if (!isOperatorEmail(row?.email)) {
    redirect("/dashboard?error=ops_forbidden");
  }

  return (
    <div className="min-h-screen bg-[#f7f5f2] text-[var(--color-body)]">
      <header className="border-b border-[var(--color-hairline)] bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-6">
            <Link href="/ops" className="font-head text-lg font-semibold text-[var(--color-primary)] no-underline">
              KOB Ops
            </Link>
            <nav className="flex gap-1 text-sm">
              <Link
                href="/ops"
                className="rounded-lg px-3 py-1.5 text-[var(--color-ink)] no-underline hover:bg-[var(--color-muted-faint)]"
              >
                Overview
              </Link>
              <Link
                href="/ops/requests"
                className="rounded-lg px-3 py-1.5 text-[var(--color-ink)] no-underline hover:bg-[var(--color-muted-faint)]"
              >
                Tickets
              </Link>
              <Link
                href="/ops/funnel"
                className="rounded-lg px-3 py-1.5 text-[var(--color-ink)] no-underline hover:bg-[var(--color-muted-faint)]"
              >
                Funnel
              </Link>
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm text-[var(--color-muted)] no-underline hover:text-[var(--color-ink)]">
            ← Owner dashboard
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
