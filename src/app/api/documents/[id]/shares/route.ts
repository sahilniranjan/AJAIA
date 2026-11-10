import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listCollaborators, shareDocument } from "@/lib/documents";
import { handle, readJson, validationError } from "@/lib/errors";
import { parseOrThrow, shareSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  const { id } = await params;
  return NextResponse.json({ collaborators: await listCollaborators(id, user.id) });
});

export const POST = handle(async (request: Request, { params }: Context) => {
  const user = await requireUser();
  const { id } = await params;
  const input = parseOrThrow(shareSchema, await readJson(request), validationError);
  return NextResponse.json(await shareDocument(id, user.id, input));
});
