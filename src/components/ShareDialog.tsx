"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { ShareRoleValue } from "@/lib/access";
import type { Collaborator } from "@/lib/types";

const ROLE_LABELS: Record<ShareRoleValue, string> = { VIEWER: "Viewer", EDITOR: "Editor" };

// Loose on purpose: the server does the real validation, this only catches obvious typos early.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}

type ShareDialogProps = { documentId: string; onClose: () => void };

/** Mounted only while open, so every open starts fresh and reloads the collaborator list. */
export function ShareDialog({ documentId, onClose }: ShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const sharesUrl = `/api/documents/${documentId}/shares`;

  const [collaborators, setCollaborators] = useState<Collaborator[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRoleValue>("VIEWER");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // showModal gives us the focus trap, inert background, and Escape-to-close for free.
  // No cleanup close(): removing the element leaves the top layer anyway, and a close() in
  // StrictMode's fake unmount would queue a close event that shuts the dialog right after opening.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ collaborators: Collaborator[] }>(sharesUrl)
      .then((data) => {
        if (!cancelled) setCollaborators(data.collaborators);
      })
      .catch((error: unknown) => {
        if (!cancelled) setListError(errorMessage(error, "Could not load collaborators."));
      });
    return () => {
      cancelled = true;
    };
  }, [sharesUrl]);

  async function handleShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const trimmed = email.trim();
    if (!trimmed) return setFormError("Enter an email address.");
    if (!EMAIL_PATTERN.test(trimmed)) return setFormError("Enter a valid email address.");

    setSubmitting(true);
    setFormError(null);
    try {
      const shared = await apiFetch<Collaborator>(sharesUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role }),
      });
      // The server upserts, so an existing collaborator is replaced in place with the new role.
      setCollaborators((current) => {
        const list = current ?? [];
        const exists = list.some((c) => c.user.id === shared.user.id);
        return exists
          ? list.map((c) => (c.user.id === shared.user.id ? shared : c))
          : [...list, shared];
      });
      setNotice(`Shared with ${shared.user.name} as ${ROLE_LABELS[shared.role]}.`);
      setEmail("");
      emailRef.current?.focus();
    } catch (error) {
      setFormError(errorMessage(error, "Could not share this document."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(collaborator: Collaborator) {
    setRemovingId(collaborator.user.id);
    setListError(null);
    setNotice(null);
    try {
      await apiFetch<void>(`${sharesUrl}/${collaborator.user.id}`, { method: "DELETE" });
      setCollaborators((current) => (current ?? []).filter((c) => c.user.id !== collaborator.user.id));
      setNotice(`Removed ${collaborator.user.name}.`);
    } catch (error) {
      setListError(errorMessage(error, "Could not remove this person."));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="share-dialog-title"
      // Fires for Escape and for dialog.close(), so the parent always learns the dialog is gone.
      onClose={onClose}
      className="m-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <h2 id="share-dialog-title" className="text-lg font-semibold text-slate-900">
            Share document
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleShare} noValidate className="mt-4 space-y-2">
          <label htmlFor="share-email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="flex gap-2">
            <input
              ref={emailRef}
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
              aria-invalid={formError ? true : undefined}
              aria-describedby="share-email-help share-email-error"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
            />
            <label htmlFor="share-role" className="sr-only">
              Role
            </label>
            <select
              id="share-role"
              value={role}
              onChange={(e) => setRole(e.target.value as ShareRoleValue)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
            >
              {submitting ? "Sharing..." : "Share"}
            </button>
          </div>
          <p id="share-email-help" className="text-xs text-slate-500">
            Demo accounts: alice@demo.com, bob@demo.com, carol@demo.com
          </p>
          <p id="share-email-error" role="alert" className="text-sm text-red-700">
            {formError}
          </p>
        </form>

        <p aria-live="polite" className="text-sm text-green-700">
          {notice}
        </p>

        <h3 className="mt-4 text-sm font-medium text-slate-700">People with access</h3>
        {listError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {listError}
          </p>
        )}
        <CollaboratorList
          collaborators={collaborators}
          removingId={removingId}
          onRemove={handleRemove}
        />
      </div>
    </dialog>
  );
}

type CollaboratorListProps = {
  collaborators: Collaborator[] | null;
  removingId: string | null;
  onRemove: (collaborator: Collaborator) => void;
};

function CollaboratorList({ collaborators, removingId, onRemove }: CollaboratorListProps) {
  if (collaborators === null) return <p className="mt-2 text-sm text-slate-500">Loading...</p>;
  if (collaborators.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">Not shared with anyone yet.</p>;
  }
  return (
    <ul className="mt-2 divide-y divide-slate-100">
      {collaborators.map((c) => (
        <li key={c.user.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{c.user.name}</p>
            <p className="truncate text-xs text-slate-500">{c.user.email}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {ROLE_LABELS[c.role]}
            </span>
            <button
              type="button"
              onClick={() => onRemove(c)}
              disabled={removingId === c.user.id}
              aria-label={`Remove ${c.user.name}`}
              className="rounded text-sm text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60"
            >
              {removingId === c.user.id ? "Removing..." : "Remove"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
