import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { revokeShare } from "@/lib/documents";
import { handle } from "@/lib/errors";

type Context = { params: Promise<{ id: string; userId: string }> };

export const DELETE = handle(async (_request: Request, { params }: Context) => {
  const user = await requireUser();
  const { id, userId } = await params;
  await revokeShare(id, user.id, userId);
  return new NextResponse(null, { status: 204 });
});
