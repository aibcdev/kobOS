import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { isSameOrigin } from "@/lib/security/same-origin";

/** Live connectors always require a real session and DB membership, including in preview mode. */
export async function talkAccess(restaurantId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      ok: false as const,
      status: 401,
      error: "Sign in to use your restaurant's connections.",
    };
  const member = await prisma.teamMember.findUnique({
    where: { userId_restaurantId: { userId: user.id, restaurantId } },
    include: { restaurant: true },
  });
  if (!member)
    return {
      ok: false as const,
      status: 403,
      error: "You don't have access to this restaurant.",
    };
  return { ok: true as const, userId: user.id, restaurant: member.restaurant };
}

/** Browsers always send Origin on these POSTs, so it's required; deploy previews and proxies are allowed via isSameOrigin. */
export function sameOrigin(req: Request) {
  return req.headers.get("origin") !== null && isSameOrigin(req);
}
