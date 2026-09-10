import { notFound } from "next/navigation";
import { DraftApprovalButton } from "@/components/service-requests/DraftApprovalButton";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your KOB drafts", robots: { index: false, follow: false } };

export default async function ServiceDraftPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const selected = await prisma.serviceRequestDraft.findUnique({
    where: { previewToken: token },
    include: {
      request: {
        include: {
          drafts: { orderBy: { draftNumber: "asc" } },
          restaurant: { select: { name: true } },
        },
      },
    },
  });
  if (!selected) notFound();
  const request = selected.request;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">KOB preview</p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
        Three {request.title.toLowerCase()} drafts for {request.restaurant.name}
      </h1>
      <p className="mt-3 text-[var(--color-muted)]">
        Review the options. Credits are charged only when you approve one. Pro social requests are included.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {request.drafts.map((draft) => (
          <article key={draft.id} className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Draft {draft.draftNumber}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">{draft.title}</h2>
            {draft.assetUrl && request.type === "SOCIAL_VIDEO" ? (
              <video controls preload="metadata" className="mt-4 w-full rounded-xl" src={draft.assetUrl} />
            ) : draft.assetUrl ? (
              // Operator-curated remote assets can live on any secure host.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.assetUrl} alt={draft.title} className="mt-4 w-full rounded-xl object-cover" />
            ) : null}
            {draft.body ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--color-muted)]">{draft.body}</p> : null}
            <DraftApprovalButton
              requestId={request.id}
              draftId={draft.id}
              approved={request.approvedDraftId === draft.id}
            />
          </article>
        ))}
      </div>
    </main>
  );
}
