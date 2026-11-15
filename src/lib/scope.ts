/**
 * Tenant-scoping helpers.
 *
 * WHY THIS EXISTS
 * Prisma treats `{ groupId: undefined }` as "no condition". Inside an `OR`
 * that turns the branch into `{}`, which matches EVERY row. Any user without an
 * active group therefore saw (and could change) other users' data.
 *
 * Rule: never pass `groupId || undefined` to a Prisma filter. Use `NO_GROUP`
 * (a value no real cuid can equal, so the branch matches nothing) or `mine()`.
 */
export const NO_GROUP = "__no_group__";

/** `{ [ownerField]: userId }` OR, only when a group is active, `{ groupId }`. */
export function mine(
  userId: string,
  groupId: string | null | undefined,
  ownerField: string = "userId"
) {
  return groupId
    ? { OR: [{ [ownerField]: userId }, { groupId }] }
    : { [ownerField]: userId };
}

import { prisma } from "@/lib/db";

/**
 * Returns the group id only if the user may WRITE in it (OWNER/ADMIN/MEMBER).
 * GUESTs are read-only, so they get null (= "no writable group").
 */
export async function getWritableGroupId(
  userId: string,
  groupId: string | null | undefined
): Promise<string | null> {
  if (!groupId) return null;
  const m = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { role: true },
  });
  return m && m.role !== "GUEST" ? groupId : null;
}

/**
 * Server actions can be called by the browser with ANY arguments. A `groupId`
 * argument is only honoured when the caller really is a member of that group.
 */
export async function onlyIfMember(
  userId: string,
  groupId: string | null | undefined
): Promise<string | null> {
  if (!groupId) return null;
  const m = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { id: true },
  });
  return m ? groupId : null;
}
