import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { AppError } from "@/lib/errors";
import {
  MAX_IMPORT_BYTES,
  convertFileToDocument,
  titleFromFilename,
  validateImportFile,
} from "@/lib/import";
import { DEFAULT_TITLE } from "@/lib/validation";

const encode = (text: string) => new TextEncoder().encode(text);

function fileOf(name: string, bytes: Uint8Array) {
  return { name, size: bytes.byteLength, bytes };
}

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
  return undefined;
}

/** Collects all text in a node tree, so degradation tests can check that words survive. */
function allText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(allText).join(" ");
}

function collectTypes(node: JSONContent, out = new Set<string>()): Set<string> {
  if (node.type) out.add(node.type);
  node.marks?.forEach((m) => out.add(`mark:${m.type}`));
  node.content?.forEach((c) => collectTypes(c, out));
  return out;
}

describe("markdown import", () => {
  const md = [
    "# Title",
    "## Subtitle",
    "Some **bold** and *italic* text.",
    "- one\n- two",
    "1. first\n2. second",
  ].join("\n\n");
  const { content } = convertFileToDocument("notes.md", md);
  const nodes = content.content;

  it("maps headings, lists and paragraphs to editor node types", () => {
    expect(content.type).toBe("doc");
    expect(nodes.map((n) => n.type)).toEqual([
      "heading",
      "heading",
      "paragraph",
      "bulletList",
      "orderedList",
    ]);
    expect(nodes[0].attrs?.level).toBe(1);
    expect(nodes[1].attrs?.level).toBe(2);
    expect(nodes[3].content?.[0].type).toBe("listItem");
    expect(nodes[4].content).toHaveLength(2);
  });

  it("keeps bold and italic marks", () => {
    const marks = (nodes[2].content ?? []).map((t) => ({ text: t.text, marks: t.marks?.map((m) => m.type) }));
    expect(marks).toContainEqual({ text: "bold", marks: ["bold"] });
    expect(marks).toContainEqual({ text: "italic", marks: ["italic"] });
  });

  it("degrades an h3 to a plain paragraph because the editor only has H1 and H2", () => {
    const doc = convertFileToDocument("a.md", "### Small heading").content;
    expect(doc.content).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "Small heading" }] },
    ]);
  });

  it("degrades images, tables, code blocks and links to text without throwing", () => {
    const source = [
      "![A team photo](https://example.com/x.png)",
      "| Name | Role |\n| --- | --- |\n| Alice | Editor |",
      "```\nconst x = 1;\nconst y = 2;\n```",
      "See [the docs](https://example.com).",
    ].join("\n\n");
    const doc = convertFileToDocument("a.md", source).content;
    const types = collectTypes(doc);
    for (const unsupported of ["image", "table", "codeBlock", "mark:link", "mark:code"]) {
      expect(types.has(unsupported)).toBe(false);
    }
    const text = allText(doc);
    expect(text).toContain("A team photo");
    expect(text).toContain("Name | Role");
    expect(text).toContain("Alice | Editor");
    expect(text).toContain("const x = 1;");
    expect(text).toContain("the docs");
  });

  it("shows raw HTML in markdown as literal text instead of markup", () => {
    const doc = convertFileToDocument("a.md", "<b>not bold</b>\n\nhi <i>there</i>").content;
    expect(collectTypes(doc).has("mark:bold")).toBe(false);
    expect(allText(doc)).toContain("<b>not bold</b>");
    expect(allText(doc)).toContain("<i>");
  });
});

describe("plain text import", () => {
  it("turns blank-line blocks into paragraphs and single newlines into hard breaks", () => {
    const { content } = convertFileToDocument("a.txt", "Line one\r\nLine two\n\n\nSecond para\n");
    expect(content.content).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Line one" },
          { type: "hardBreak" },
          { type: "text", text: "Line two" },
        ],
      },
      { type: "paragraph", content: [{ type: "text", text: "Second para" }] },
    ]);
  });

  it("keeps HTML in a .txt file as literal text", () => {
    const { content } = convertFileToDocument("a.txt", "<script>alert(1)</script> <b>hi</b>");
    expect(content.content).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script> <b>hi</b>" }] },
    ]);
  });
});

describe("file validation", () => {
  it("returns the decoded text for a valid file", () => {
    expect(validateImportFile(fileOf("a.TXT", encode("héllo")))).toBe("héllo");
  });

  it("rejects empty and whitespace-only files", () => {
    expect(errorCode(() => validateImportFile(fileOf("a.txt", new Uint8Array())))).toBe("VALIDATION_ERROR");
    expect(errorCode(() => validateImportFile(fileOf("a.md", encode(" \n\t\n "))))).toBe("VALIDATION_ERROR");
  });

  it("rejects unsupported extensions, even with a text-like name", () => {
    expect(errorCode(() => validateImportFile(fileOf("a.pdf", encode("x"))))).toBe("UNSUPPORTED_FILE_TYPE");
    expect(errorCode(() => validateImportFile(fileOf("md", encode("x"))))).toBe("UNSUPPORTED_FILE_TYPE");
    expect(errorCode(() => validateImportFile(fileOf("a.md.exe", encode("x"))))).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("rejects files over 1 MB", () => {
    const big = new Uint8Array(MAX_IMPORT_BYTES + 1).fill(0x61);
    expect(errorCode(() => validateImportFile(fileOf("a.txt", big)))).toBe("PAYLOAD_TOO_LARGE");
  });

  it("rejects bytes that are not valid UTF-8", () => {
    const bytes = new Uint8Array([0x68, 0x69, 0xff, 0xfe]);
    expect(errorCode(() => validateImportFile(fileOf("a.txt", bytes)))).toBe("VALIDATION_ERROR");
  });
});

describe("title from filename", () => {
  it("drops the extension, trims, caps at 200 chars, and falls back to the default", () => {
    expect(titleFromFilename("  Meeting notes .md")).toBe("Meeting notes");
    expect(titleFromFilename(`${"a".repeat(250)}.txt`)).toHaveLength(200);
    expect(titleFromFilename("   .txt")).toBe(DEFAULT_TITLE);
    expect(titleFromFilename(".md")).toBe(DEFAULT_TITLE);
  });
});
