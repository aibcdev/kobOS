import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/prisma";

/** Ensures a Prisma `User` row exists for the Supabase Auth user (id = auth user uuid). */
export async function ensureAppUser(authUser: SupabaseAuthUser): Promise<void> {
  const email = authUser.email?.trim();
  if (!email) {
    throw new Error("Authenticated user has no email — cannot create app profile.");
  }

  const name =
    (typeof authUser.user_metadata?.full_name === "string" && authUser.user_metadata.full_name) ||
    (typeof authUser.user_metadata?.name === "string" && authUser.user_metadata.name) ||
    undefined;
  const avatarUrl =
    typeof authUser.user_metadata?.avatar_url === "string"
      ? authUser.user_metadata.avatar_url
      : undefined;

  await prisma.user.upsert({
    where: { id: authUser.id },
    create: {
      id: authUser.id,
      email,
      name,
      avatarUrl,
    },
    update: {
      email,
      ...(name !== undefined ? { name } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
  });
}

export async function userRestaurants(userId: string) {
  const members = await prisma.teamMember.findMany({
    where: { userId },
    include: { restaurant: true },
  });
  return members.map((m) => m.restaurant);
}
