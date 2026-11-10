import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { deleteDocument, getDocumentForUser, updateDocument } from "@/lib/documents";
import { handle, readJson, validationError } from "@/lib/errors";
import { parseOrThrow, patchDocumentSchema } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json(await getDocumentForUser(id, user.id));
});

export const PATCH = handle(async (request: Request, { params }: Context) => {
  const user = await requireUser();
  const { id } = await params;
  const input = parseOrThrow(patchDocumentSchema, await readJson(request), validationError);
  const updated = await updateDocument(id, user.id, {
    title: input.title,
    // zod's loose object type allows unknown values, but the input came from JSON so it is JSON-safe.
    content: input.content as Prisma.InputJsonValue | undefined,
  });
  return NextResponse.json(updated);
});

export const DELETE = handle(async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  const { id } = await params;
  await deleteDocument(id, user.id);
  return new NextResponse(null, { status: 204 });
});
