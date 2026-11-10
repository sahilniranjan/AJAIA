"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { documentExtensions } from "@/lib/editor-extensions";
import type { DocumentDetail, PatchDocumentResponse } from "@/lib/types";
import { MAX_TITLE_LENGTH } from "@/lib/validation";
import { useAutosave } from "@/hooks/useAutosave";
import { SaveStatus } from "./SaveStatus";
import { ShareDialog } from "./ShareDialog";
import { Toolbar } from "./Toolbar";

// Defined once at module level so the editor is not rebuilt on every render.
const editorExtensions = [...documentExtensions, Placeholder.configure({ placeholder: "Start writing..." })];

const buttonClass =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60";

function patchDocument(id: string, body: { title?: string; content?: JSONContent }) {
  return apiFetch<PatchDocumentResponse>(`/api/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function DocumentEditor({ doc }: { doc: DocumentDetail }) {
  const canEdit = doc.access !== "viewer";
  const isOwner = doc.access === "owner";
  const [shareOpen, setShareOpen] = useState(false);

  const saveContent = useCallback(
    async (content: JSONContent) => {
      await patchDocument(doc.id, { content });
    },
    [doc.id],
  );
  const autosave = useAutosave({ save: saveContent, enabled: canEdit });
  const { markDirty, hasUnsavedChanges } = autosave;

  const editor = useEditor({
    extensions: editorExtensions,
    // The server only stores content that passed the { type: "doc" } check.
    content: doc.content as JSONContent,
    editable: canEdit,
    // Required with SSR: the editor can only be created in the browser.
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => markDirty(e.getJSON()),
    editorProps: {
      attributes: {
        class: "prose-editor min-h-[50vh] px-8 py-6 sm:px-12",
        "aria-label": "Document content",
      },
    },
  });

  useUnsavedChangesWarning(hasUnsavedChanges);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href="/"
        className="rounded text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        &larr; Back to documents
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <TitleField documentId={doc.id} initialTitle={doc.title} canEdit={canEdit} />
        {canEdit && <SaveStatus status={autosave.status} onRetry={autosave.retry} />}
        {isOwner && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setShareOpen(true)} className={buttonClass}>
              Share
            </button>
            <DeleteButton documentId={doc.id} />
          </div>
        )}
      </div>

      <RoleContext doc={doc} />

      {canEdit && editor && (
        <div className="mt-4">
          <Toolbar editor={editor} />
        </div>
      )}

      <div className="mt-3 rounded-lg border border-slate-200 bg-white shadow-sm">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <p className="px-8 py-6 text-sm text-slate-400">Loading editor...</p>
        )}
      </div>

      {shareOpen && <ShareDialog documentId={doc.id} onClose={() => setShareOpen(false)} />}
    </main>
  );
}

function useUnsavedChangesWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older Chrome and Edge only show the prompt when returnValue is set.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}

function RoleContext({ doc }: { doc: DocumentDetail }) {
  if (doc.access === "editor") {
    return (
      <p className="mt-2 text-sm text-slate-600">
        Shared with you by {doc.owner.name} - Editor
      </p>
    );
  }
  if (doc.access === "viewer") {
    return (
      <div
        role="status"
        className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
      >
        You have view-only access. Shared by {doc.owner.name}.
      </div>
    );
  }
  return null;
}

type TitleFieldProps = { documentId: string; initialTitle: string; canEdit: boolean };

function TitleField({ documentId, initialTitle, canEdit }: TitleFieldProps) {
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) {
    return <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">{title}</h1>;
  }

  async function save() {
    if (title.trim() === savedTitle) {
      // Undo stray whitespace without a request.
      setTitle(savedTitle);
      return;
    }
    try {
      const updated = await patchDocument(documentId, { title });
      // The server trims and falls back to the default title, so show what it stored.
      setTitle(updated.title);
      setSavedTitle(updated.title);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Couldn't save the title.");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Blur triggers the save, so Enter and clicking away share one code path.
    if (event.key === "Enter") event.currentTarget.blur();
  }

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor="document-title" className="sr-only">
        Document title
      </label>
      <input
        id="document-title"
        value={title}
        maxLength={MAX_TITLE_LENGTH}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "document-title-error" : undefined}
        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-2xl font-semibold hover:border-slate-300 focus-visible:border-slate-300 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
      />
      {error && (
        <p id="document-title-error" role="alert" className="px-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function DeleteButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch<void>(`/api/documents/${documentId}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Couldn't delete the document.");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className={`${buttonClass} text-red-700`}
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm text-red-700">
          {error}
        </p>
      )}
    </>
  );
}
