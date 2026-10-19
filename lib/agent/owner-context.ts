import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled, PREVIEW_USER_ID } from "@/lib/preview/ui-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OwnerContext =
  | { kind: "signed-out" }
  | { kind: "no-restaurant" }
  | { kind: "ok"; userId: string; role: Role; restaurant: { id: string; name: string; timezone: string } };

/** Signed-in user and the restaurant they picked (`?r=`), for product pages. Preview mode uses the preview user. */
export async function loadOwnerContext(requested?: string | string[]): Promise<OwnerContext> {
  let userId: string | null = null;
  if (isUiPreviewEnabled()) {
    userId = PREVIEW_USER_ID;
  } else {
    try {
      const supabase = await createSupabaseServerClient();
      userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    } catch {
      userId = null;
    }
  }
  if (!userId) return { kind: "signed-out" };

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: { restaurant: { select: { id: true, name: true, timezone: true } } },
    orderBy: { createdAt: "asc" },
  });
  const selected = typeof requested === "string" ? memberships.find((m) => m.restaurantId === requested) : memberships[0];
  if (!selected) return { kind: "no-restaurant" };
  return { kind: "ok", userId, role: selected.role, restaurant: selected.restaurant };
}
