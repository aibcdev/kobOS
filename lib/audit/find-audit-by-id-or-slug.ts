import { prisma } from "@/lib/db/prisma";
import type { VisibilityAudit } from "@prisma/client";

/** Resolve a VisibilityAudit by cuid id or pretty slug. */
export async function findVisibilityAuditByIdOrSlug(
  idOrSlug: string,
): Promise<VisibilityAudit | null> {
  const key = idOrSlug.trim();
  if (!key) return null;

  const byId = await prisma.visibilityAudit.findUnique({ where: { id: key } });
  if (byId) return byId;

  return prisma.visibilityAudit.findUnique({ where: { slug: key } });
}

export async function findVisibilityAuditIdOrSlugSelect<T extends Record<string, boolean>>(
  idOrSlug: string,
  select: T,
) {
  const key = idOrSlug.trim();
  if (!key) return null;

  const byId = await prisma.visibilityAudit.findUnique({ where: { id: key }, select });
  if (byId) return byId;

  return prisma.visibilityAudit.findUnique({ where: { slug: key }, select });
}
