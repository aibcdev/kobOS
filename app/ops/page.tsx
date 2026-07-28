import type { Metadata } from "next";
import Link from "next/link";
import { ServiceRequestStatus } from "@prisma/client";

import { appBtnPrimary, appCardSurface } from "@/lib/app-ui-classes";
import { catalogTitle } from "@/lib/credits/catalog";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Ops · KOB",
  description: "Internal operator dashboard — owner requests and tickets.",
  robots: { index: false, follow: false },
};

export default async function OpsHomePage() {
  const [requested, inProgress, deliveredToday] = await Promise.all([
    prisma.serviceRequest.count({ where: { status: ServiceRequestStatus.REQUESTED } }),
    prisma.serviceRequest.count({ where: { status: ServiceRequestStatus.IN_PROGRESS } }),
    prisma.serviceRequest.count({
      where: {
        status: ServiceRequestStatus.DELIVERED,
        deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  const recent = await prisma.serviceRequest.findMany({
    where: { status: { in: [ServiceRequestStatus.REQUESTED, ServiceRequestStatus.IN_PROGRESS] } },
    orderBy: { createdAt: "asc" },
    take: 8,
    include: { restaurant: { select: { name: true, city: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
        Internal
      </p>
      <h1 className="mt-2 font-head text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
        Operator dashboard
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">
        Owner green buttons land here as <strong className="font-medium text-[var(--color-ink)]">Requested</strong>{" "}
        tickets — pick up, fulfill, mark delivered. Never treat a click as done until you ship it.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className={appCardSurface}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
            Requested
          </p>
          <p className="mt-2 font-head text-3xl font-semibold tabular-nums text-[var(--color-ink)]">
            {requested}
          </p>
        </div>
        <div className={appCardSurface}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
            In progress
          </p>
          <p className="mt-2 font-head text-3xl font-semibold tabular-nums text-[var(--color-ink)]">
            {inProgress}
          </p>
        </div>
        <div className={appCardSurface}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
            Delivered today
          </p>
          <p className="mt-2 font-head text-3xl font-semibold tabular-nums text-[var(--color-ink)]">
            {deliveredToday}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Open queue</h2>
          <Link href="/ops/funnel" className={`${appBtnPrimary} !min-h-10 !px-4 !py-2 text-sm no-underline`}>
            Acquisition funnel
          </Link>
          <Link href="/ops/requests" className={`${appBtnPrimary} !min-h-10 !px-4 !py-2 text-sm no-underline`}>
            Open ticket rail
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className={`mt-4 ${appCardSurface} text-sm text-[var(--color-muted)]`}>No open tickets.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recent.map((t) => (
              <li key={t.id} className={appCardSurface}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  {catalogTitle(t.type)} · {t.status.replace(/_/g, " ")}
                </p>
                <p className="mt-1 font-medium text-[var(--color-ink)]">{t.title}</p>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {t.restaurant.name}
                  {t.restaurant.city ? ` · ${t.restaurant.city}` : ""}
                  {" · "}
                  {new Date(t.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
