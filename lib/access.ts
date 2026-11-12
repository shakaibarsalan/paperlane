// Pure access rules. Kept free of I/O so they are easy to test and reason about.
export type ShareRole = "viewer" | "editor";
export type Role = "owner" | ShareRole;

/** Resolve what a user may do with a document. null = no access at all. */
export function resolveRole(
  ownerId: string,
  userId: string,
  shareRole: ShareRole | null | undefined,
): Role | null {
  if (ownerId === userId) return "owner";
  if (shareRole === "editor" || shareRole === "viewer") return shareRole;
  return null;
}

export const canView = (role: Role | null): boolean => role !== null;
export const canEdit = (role: Role | null): boolean => role === "owner" || role === "editor";
/** Only the owner can share, change roles, rename-delete the document. */
export const canManage = (role: Role | null): boolean => role === "owner";
