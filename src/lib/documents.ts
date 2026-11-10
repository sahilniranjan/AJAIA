import { db } from "./db";
import { canEdit, canManage, canView, resolveAccess, type Access } from "./access";
import { forbidden, notFound, validationError } from "./errors";
import { DEFAULT_TITLE, EMPTY_DOC } from "./validation";
import type { Prisma } from "@/generated/prisma/client";
import type {
  Collaborator,
  DocumentDetail,
  DocumentListResponse,
  PatchDocumentResponse,
} from "./types";

const userSelect = { id: true, name: true, email: true } as const;

/** Loads a document and the caller's access. Throws 404 when the caller cannot see it. */
async function loadWithAccess(documentId: string, userId: string) {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: { shares: { select: { userId: true, role: true } }, owner: { select: userSelect } },
  });
  // Missing and no-access both become 404 so ids cannot be probed.
  if (!doc) throw notFound();
  const access = resolveAccess(userId, doc);
  if (!canView(access)) throw notFound();
  return { doc, access };
}

function assert(allowed: boolean, message?: string) {
  if (!allowed) throw forbidden(message);
}

export async function listDocumentsForUser(userId: string): Promise<DocumentListResponse> {
  const [owned, shared] = await Promise.all([
    db.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, _count: { select: { shares: true } } },
    }),
    db.documentShare.findMany({
      where: { userId, document: { ownerId: { not: userId } } },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        role: true,
        document: {
          select: { id: true, title: true, updatedAt: true, owner: { select: userSelect } },
        },
      },
    }),
  ]);

  return {
    owned: owned.map((d) => ({
      id: d.id,
      title: d.title,
      updatedAt: d.updatedAt.toISOString(),
      shareCount: d._count.shares,
    })),
    shared: shared.map((s) => ({
      id: s.document.id,
      title: s.document.title,
      updatedAt: s.document.updatedAt.toISOString(),
      owner: s.document.owner,
      role: s.role,
    })),
  };
}

export async function getDocumentForUser(
  documentId: string,
  userId: string,
): Promise<DocumentDetail> {
  const { doc, access } = await loadWithAccess(documentId, userId);
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    updatedAt: doc.updatedAt.toISOString(),
    access: access as Exclude<Access, "none">,
    owner: doc.owner,
  };
}

export async function createDocument(
  ownerId: string,
  input: { title?: string; content?: Prisma.InputJsonValue } = {},
) {
  return db.document.create({
    data: {
      ownerId,
      title: input.title ?? DEFAULT_TITLE,
      content: input.content ?? EMPTY_DOC,
    },
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function updateDocument(
  documentId: string,
  userId: string,
  input: { title?: string; content?: Prisma.InputJsonValue },
): Promise<PatchDocumentResponse> {
  const { access } = await loadWithAccess(documentId, userId);
  assert(canEdit(access), "You have view-only access to this document.");
  const doc = await db.document.update({
    where: { id: documentId },
    data: input,
    select: { id: true, title: true, updatedAt: true },
  });
  return { ...doc, updatedAt: doc.updatedAt.toISOString() };
}

export async function deleteDocument(documentId: string, userId: string) {
  const { access } = await loadWithAccess(documentId, userId);
  assert(canManage(access), "Only the owner can delete this document.");
  await db.document.delete({ where: { id: documentId } });
}

export async function listCollaborators(
  documentId: string,
  userId: string,
): Promise<Collaborator[]> {
  const { access } = await loadWithAccess(documentId, userId);
  assert(canManage(access), "Only the owner can manage sharing.");
  const shares = await db.documentShare.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
    select: { role: true, user: { select: userSelect } },
  });
  return shares;
}

export async function shareDocument(
  documentId: string,
  userId: string,
  input: { email: string; role: "VIEWER" | "EDITOR" },
): Promise<Collaborator> {
  const { doc, access } = await loadWithAccess(documentId, userId);
  assert(canManage(access), "Only the owner can manage sharing.");
  const target = await db.user.findUnique({ where: { email: input.email }, select: userSelect });
  if (!target) throw validationError(`No user found with email ${input.email}.`);
  // Checked after access so strangers still get 404. Only owners reach this point, so the
  // owner check also covers sharing with yourself and keeps owners out of the share table.
  if (target.id === doc.ownerId) throw validationError("You can't share a document with yourself.");

  const share = await db.documentShare.upsert({
    where: { documentId_userId: { documentId, userId: target.id } },
    update: { role: input.role },
    create: { documentId, userId: target.id, role: input.role },
    select: { role: true },
  });
  return { user: target, role: share.role };
}

export async function revokeShare(documentId: string, userId: string, targetUserId: string) {
  const { access } = await loadWithAccess(documentId, userId);
  assert(canManage(access), "Only the owner can manage sharing.");
  await db.documentShare.deleteMany({ where: { documentId, userId: targetUserId } });
}
