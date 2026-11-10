import { describe, expect, it } from "vitest";
import { canEdit, canManage, canView, resolveAccess, type Access } from "@/lib/access";

const doc = {
  ownerId: "owner",
  shares: [
    { userId: "editor", role: "EDITOR" as const },
    { userId: "viewer", role: "VIEWER" as const },
  ],
};

// Mirrors the permission matrix in CLAUDE.md section 8.
const matrix: { userId: string; access: Access; view: boolean; edit: boolean; manage: boolean }[] = [
  { userId: "owner", access: "owner", view: true, edit: true, manage: true },
  { userId: "editor", access: "editor", view: true, edit: true, manage: false },
  { userId: "viewer", access: "viewer", view: true, edit: false, manage: false },
  { userId: "stranger", access: "none", view: false, edit: false, manage: false },
];

describe("resolveAccess and permission checks", () => {
  for (const row of matrix) {
    describe(row.userId, () => {
      const access = resolveAccess(row.userId, doc);

      it(`resolves to ${row.access}`, () => {
        expect(access).toBe(row.access);
      });

      it(`canView is ${row.view}`, () => {
        expect(canView(access)).toBe(row.view);
      });

      it(`canEdit is ${row.edit}`, () => {
        expect(canEdit(access)).toBe(row.edit);
      });

      it(`canManage is ${row.manage}`, () => {
        expect(canManage(access)).toBe(row.manage);
      });
    });
  }

  it("owner wins even if a share row exists for the owner", () => {
    const withStrayShare = { ownerId: "owner", shares: [{ userId: "owner", role: "VIEWER" as const }] };
    const access = resolveAccess("owner", withStrayShare);
    expect(access).toBe("owner");
    expect(canManage(access)).toBe(true);
  });

  it("treats a document with no shares as private to the owner", () => {
    expect(resolveAccess("someone", { ownerId: "owner", shares: [] })).toBe("none");
  });
});
