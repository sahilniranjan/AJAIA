"use client";

import { useId, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

// Mirrors the rules in src/lib/import.ts. That module pulls in server-only parsing code,
// so the limits are repeated here for a fast pre-check; the server stays the authority.
const MAX_BYTES = 1_000_000;
const ALLOWED = [".txt", ".md"];

function preCheck(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  const ext = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  if (!ALLOWED.includes(ext)) return "Only .txt and .md files are supported.";
  if (file.size > MAX_BYTES) return "File is too large. The limit is 1 MB.";
  if (file.size === 0) return "The file is empty.";
  return null;
}

export function ImportButton() {
  const router = useRouter();
  const inputId = useId();
  const helpId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again after an error still fires onChange.
    event.target.value = "";
    if (!file) return;

    const problem = preCheck(file);
    if (problem) {
      setError(problem);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const doc = await apiFetch<{ id: string }>("/api/documents/import", {
        method: "POST",
        body,
      });
      router.push(`/docs/${doc.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't import the file. Please try again.");
      setPending(false);
    }
  }

  return (
    <div>
      <input
          id={inputId}
        type="file"
        accept=".txt,.md"
        className="peer sr-only"
        onChange={onChange}
        disabled={pending}
        aria-describedby={helpId}
      />
      <label
        htmlFor={inputId}
        className={`inline-block cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 ${pending ? "pointer-events-none opacity-60" : ""}`}
      >
        {pending ? "Importing..." : "Import file"}
      </label>
      <p id={helpId} className="mt-1 text-xs text-slate-500">
        Supports .txt and .md, up to 1 MB
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
