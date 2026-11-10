import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LoginCards } from "@/components/LoginCards";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { email: "asc" },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-bold">Ajaia Docs</h1>
      <p className="mt-2 text-slate-600">Write, format, and share documents with your team.</p>
      <p className="mt-8 text-sm font-medium text-slate-700">
        Demo accounts. Sign in as different users to test sharing.
      </p>
      <LoginCards users={users} />
    </main>
  );
}
