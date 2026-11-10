import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/errors";

export const GET = handle(async () => {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { email: "asc" },
  });
  return NextResponse.json({ users });
});
