import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDocument, listDocumentsForUser } from "@/lib/documents";
import { handle, readJson, validationError } from "@/lib/errors";
import { createDocumentSchema, parseOrThrow } from "@/lib/validation";

export const GET = handle(async () => {
  const user = await requireUser();
  return NextResponse.json(await listDocumentsForUser(user.id));
});

export const POST = handle(async (request: Request) => {
  const user = await requireUser();
  const input = parseOrThrow(createDocumentSchema, await readJson(request), validationError);
  const doc = await createDocument(user.id, { title: input.title });
  return NextResponse.json(
    { id: doc.id, title: doc.title, updatedAt: doc.updatedAt.toISOString() },
    { status: 201 },
  );
});
