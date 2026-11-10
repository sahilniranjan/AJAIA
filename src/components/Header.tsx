"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserSummary } from "@/lib/types";

export function Header({ user }: { user: UserSummary }) {
  const router = useRouter();

  async function switchUser() {
    await fetch("/api/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-slate-900">
          Ajaia Docs
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{user.name}</span>
          </span>
          <button
            type="button"
            onClick={switchUser}
            className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Switch user
          </button>
        </div>
      </div>
    </header>
  );
}
