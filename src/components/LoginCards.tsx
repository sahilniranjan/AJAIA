"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { UserSummary } from "@/lib/types";

export function LoginCards({ users }: { users: UserSummary[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(userId: string) {
    setPendingId(userId);
    setError(null);
    try {
      await apiFetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Could not sign in.");
      setPendingId(null);
    }
  }

  if (users.length === 0) {
    return <p className="mt-4 text-slate-600">No demo users found. Run the seed script.</p>;
  }

  return (
    <>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {users.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              onClick={() => signIn(user.id)}
              disabled={pendingId !== null}
              className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:shadow focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                {user.name[0]}
              </span>
              <span className="mt-3 block font-medium">{user.name}</span>
              <span className="block text-sm text-slate-500">{user.email}</span>
              {pendingId === user.id && (
                <span className="mt-1 block text-xs text-blue-600">Signing in...</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
