import { Marked, type RendererObject } from "marked";
import { generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/core";
import { documentExtensions } from "./editor-extensions";
import { AppError, validationError } from "./errors";
import { DEFAULT_TITLE, MAX_CONTENT_BYTES, MAX_TITLE_LENGTH } from "./validation";

export const MAX_IMPORT_BYTES = 1_000_000;
export const ALLOWED_IMPORT_EXTENSIONS = [".txt", ".md"] as const;
type ImportExtension = (typeof ALLOWED_IMPORT_EXTENSIONS)[number];

export type ImportedDocument = {
  title: string;
  content: { type: "doc"; content: JSONContent[] };
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function isAllowedExtension(ext: string): ext is ImportExtension {
  return (ALLOWED_IMPORT_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Checks name and size only, so the route can reject a bad file before reading its bytes.
 * The extension is the source of truth because browsers report .md MIME types inconsistently.
 */
export function checkImportFileMeta({ name, size }: { name: string; size: number }): void {
  if (!isAllowedExtension(extensionOf(name))) {
    throw new AppError("UNSUPPORTED_FILE_TYPE", "Only .txt and .md files are supported.");
  }
  if (size > MAX_IMPORT_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "File is too large. The limit is 1 MB.");
  }
  if (size === 0) throw validationError("The file is empty.");
}

/** Validates an uploaded file and returns its text. Throws AppError with a friendly message. */
export function validateImportFile({
  name,
  size,
  bytes,
}: {
  name: string;
  size: number;
  bytes: Uint8Array;
}): string {
  checkImportFileMeta({ name, size: Math.max(size, bytes.byteLength) });

  let text: string;
  try {
    // fatal: true makes binary files (or other encodings) fail loudly instead of becoming mojibake.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw validationError("The file is not valid UTF-8 text.");
  }
  // Postgres JSON columns reject NUL characters, so strip them before they reach the database.
  text = text.replace(/\u0000/g, "");
  if (text.trim() === "") throw validationError("The file is empty.");
  return text;
}

export function titleFromFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot >= 0 ? name.slice(0, dot) : name).trim();
  const title = base.slice(0, MAX_TITLE_LENGTH).trim();
  return title === "" ? DEFAULT_TITLE : title;
}

/**
 * Plain text is built straight into Tiptap JSON rather than going through HTML,
 * so text like "<b>" stays literal and can never be interpreted as markup.
 */
export function textToDoc(text: string): JSONContent[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const blocks = normalized.split(/\n[ \t]*\n/).filter((b) => b.trim() !== "");
  return blocks.map((block) => {
    const lines = block.replace(/^\n+|\n+$/g, "").split("\n");
    const content: JSONContent[] = [];
    lines.forEach((line, i) => {
      if (i > 0) content.push({ type: "hardBreak" });
      if (line !== "") content.push({ type: "text", text: line });
    });
    return { type: "paragraph", content };
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/*
 * The editor schema silently drops nodes it does not know (an image becomes an empty
 * paragraph, a table loses its cell boundaries). These overrides turn unsupported
 * markdown into readable text first, so the user keeps their words.
 */
const degradeUnsupported: RendererObject = {
  image({ text }) {
    return escapeHtml(text);
  },
  // Raw HTML in markdown is shown as literal text, matching how .txt imports behave.
  html({ text, block }) {
    const escaped = escapeHtml(text.trim());
    return block ? `<p>${escaped}</p>` : escaped;
  },
  code({ text }) {
    return `<p>${text.split("\n").map(escapeHtml).join("<br>")}</p>`;
  },
  table(token) {
    const rows = [token.header, ...token.rows].map(
      (cells) => `<p>${cells.map((cell) => this.parser.parseInline(cell.tokens)).join(" | ")}</p>`,
    );
    return rows.join("");
  },
};

const markdown = new Marked({ async: false, gfm: true, renderer: degradeUnsupported });

export function markdownToDoc(source: string): JSONContent[] {
  const html = markdown.parse(source, { async: false });
  const json = generateJSON(html, documentExtensions) as JSONContent;
  return json.content ?? [];
}

/** Converts a validated file's text into a new document's title and Tiptap content. */
export function convertFileToDocument(name: string, text: string): ImportedDocument {
  const ext = extensionOf(name);
  if (!isAllowedExtension(ext)) {
    throw new AppError("UNSUPPORTED_FILE_TYPE", "Only .txt and .md files are supported.");
  }
  const nodes = ext === ".md" ? markdownToDoc(text) : textToDoc(text);
  const content = { type: "doc" as const, content: nodes.length ? nodes : [{ type: "paragraph" }] };

  // Markup can grow during conversion; reject here so the document can still be saved later.
  if (JSON.stringify(content).length > MAX_CONTENT_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "This file is too large to import as a document.");
  }
  return { title: titleFromFilename(name), content };
}
