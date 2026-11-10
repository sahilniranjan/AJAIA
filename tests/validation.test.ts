import { describe, expect, it } from "vitest";
import {
  DEFAULT_TITLE,
  MAX_CONTENT_BYTES,
  contentSchema,
  createDocumentSchema,
  patchDocumentSchema,
  shareSchema,
  titleSchema,
} from "@/lib/validation";

describe("titleSchema", () => {
  it("trims whitespace", () => {
    expect(titleSchema.parse("  Plan  ")).toBe("Plan");
  });

  it("falls back to the default title when empty or blank", () => {
    expect(titleSchema.parse("")).toBe(DEFAULT_TITLE);
    expect(titleSchema.parse("   ")).toBe(DEFAULT_TITLE);
  });

  it("accepts 200 characters and rejects 201", () => {
    expect(titleSchema.safeParse("a".repeat(200)).success).toBe(true);
    expect(titleSchema.safeParse("a".repeat(201)).success).toBe(false);
  });

  it("lets create omit the title", () => {
    expect(createDocumentSchema.parse({})).toEqual({});
  });
});

describe("contentSchema", () => {
  it("accepts a doc node", () => {
    const doc = { type: "doc", content: [{ type: "paragraph" }] };
    expect(contentSchema.parse(doc)).toEqual(doc);
  });

  it.each([
    ["an array", [{ type: "doc" }]],
    ["a string", "doc"],
    ["a non-doc node", { type: "paragraph" }],
    ["null", null],
  ])("rejects %s", (_label, value) => {
    expect(contentSchema.safeParse(value).success).toBe(false);
  });

  it("rejects content over the size cap", () => {
    const big = { type: "doc", content: [{ type: "text", text: "x".repeat(MAX_CONTENT_BYTES) }] };
    const result = contentSchema.safeParse(big);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/too large/);
  });
});

describe("shareSchema", () => {
  it("lowercases and trims the email", () => {
    expect(shareSchema.parse({ email: "  Bob@Example.COM ", role: "EDITOR" })).toEqual({
      email: "bob@example.com",
      role: "EDITOR",
    });
  });

  it("rejects an invalid email", () => {
    expect(shareSchema.safeParse({ email: "not-an-email", role: "VIEWER" }).success).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(shareSchema.safeParse({ email: "bob@example.com", role: "OWNER" }).success).toBe(false);
    expect(shareSchema.safeParse({ email: "bob@example.com", role: "viewer" }).success).toBe(false);
  });
});

describe("patchDocumentSchema", () => {
  it("rejects a patch with no fields", () => {
    const result = patchDocumentSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Nothing to update.");
  });

  it("accepts a title-only patch", () => {
    expect(patchDocumentSchema.parse({ title: " New " })).toEqual({ title: "New" });
  });

  it("rejects a patch with bad content", () => {
    expect(patchDocumentSchema.safeParse({ content: { type: "paragraph" } }).success).toBe(false);
  });
});
