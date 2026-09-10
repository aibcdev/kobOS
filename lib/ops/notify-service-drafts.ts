import { prisma } from "@/lib/db/prisma";

export async function notifyOwnerDraftsReady(requestId: string): Promise<{ ok: boolean; reason?: string }> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      drafts: { orderBy: { draftNumber: "asc" }, take: 1 },
      restaurant: {
        select: {
          name: true,
          members: {
            where: { role: "OWNER" },
            take: 1,
            include: { user: { select: { email: true } } },
          },
        },
      },
    },
  });
  const to = request?.restaurant.members[0]?.user.email;
  const token = request?.drafts[0]?.previewToken;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!request || !to || !token || !key) return { ok: false, reason: "missing_request_email_or_resend" };

  const origin = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://trykob.com").replace(/\/$/, "");
  const url = `${origin}/preview/service/${token}`;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "KOB <onboarding@resend.dev>";
  const { Resend } = await import("resend");
  const { error } = await new Resend(key).emails.send(
    {
      from,
      to: [to],
      subject: `Your three ${request.title.toLowerCase()} drafts are ready`,
      text: `We created three drafts for ${request.restaurant.name}.\n\nReview and approve one here:\n${url}\n\nCredits are charged only after approval. Pro social requests are included.`,
    },
    { idempotencyKey: `service-drafts-${request.id}` },
  );
  return error ? { ok: false, reason: error.message } : { ok: true };
}
