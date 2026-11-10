"use client";

import type { ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";

type ToolbarButtonProps = {
  label: string;
  shortcut: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarButton({ label, shortcut, active, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={`${label} (${shortcut})`}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${
        active ? "bg-blue-100 text-blue-800" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200" />;
}

// Mac users expect Cmd in the hint; everyone else uses Ctrl. The toolbar only renders once the
// editor exists on the client, so this never causes a hydration mismatch.
const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Cmd" : "Ctrl";

export function Toolbar({ editor }: { editor: Editor }) {
  // Tiptap v3 does not re-render on every transaction, so subscribe to just the active states.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
    }),
  });

  const run = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm"
    >
      <ToolbarButton
        label="Bold"
        shortcut={`${MOD}+B`}
        active={active.bold}
        onClick={() => run().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        shortcut={`${MOD}+I`}
        active={active.italic}
        onClick={() => run().toggleItalic().run()}
      >
        <span className="font-serif italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        shortcut={`${MOD}+U`}
        active={active.underline}
        onClick={() => run().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Heading 1"
        shortcut={`${MOD}+Alt+1`}
        active={active.h1}
        onClick={() => run().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        shortcut={`${MOD}+Alt+2`}
        active={active.h2}
        onClick={() => run().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Bulleted list"
        shortcut={`${MOD}+Shift+8`}
        active={active.bulletList}
        onClick={() => run().toggleBulletList().run()}
      >
        &bull; List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        shortcut={`${MOD}+Shift+7`}
        active={active.orderedList}
        onClick={() => run().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
    </div>
  );
}
