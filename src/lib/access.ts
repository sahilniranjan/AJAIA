export type Access = "owner" | "editor" | "viewer" | "none";
export type ShareRoleValue = "VIEWER" | "EDITOR";

export type AccessInput = {
  ownerId: string;
  shares: { userId: string; role: ShareRoleValue }[];
};

/** Pure: the single source of truth for who can do what with a document. */
export function resolveAccess(userId: string, doc: AccessInput): Access {
  // Ownership wins even if a stray share row exists for the owner.
  if (doc.ownerId === userId) return "owner";
  const share = doc.shares.find((s) => s.userId === userId);
  if (!share) return "none";
  return share.role === "EDITOR" ? "editor" : "viewer";
}

export const canView = (a: Access) => a !== "none";
export const canEdit = (a: Access) => a === "owner" || a === "editor";
export const canManage = (a: Access) => a === "owner";
