import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/auth";
import { unauthenticated } from "@/lib/errors";

// Hoisted so the vi.mock factories below can reference them.
const { db, auth } = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn() },
    document: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    documentShare: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  },
  auth: { requireUser: vi.fn(), getCurrentUser: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/auth", () => auth);

import { DELETE, GET, PATCH } from "@/app/api/documents/[id]/route";
import { POST as SHARE } from "@/app/api/documents/[id]/shares/route";

const users = {
  owner: { id: "u_owner", email: "owner@example.com", name: "Owner" },
  editor: { id: "u_editor", email: "editor@example.com", name: "Editor" },
  viewer: { id: "u_viewer", email: "viewer@example.com", name: "Viewer" },
  stranger: { id: "u_stranger", email: "stranger@example.com", name: "Stranger" },
} satisfies Record<string, CurrentUser>;

const updatedAt = new Date("2026-01-01T00:00:00.000Z");

const storedDoc = {
  id: "d1",
  title: "Plan",
  content: { type: "doc", content: [] },
  ownerId: users.owner.id,
  updatedAt,
  owner: users.owner,
  shares: [
    { userId: users.editor.id, role: "EDITOR" },
    { userId: users.viewer.id, role: "VIEWER" },
  ],
};

const ctx = { params: Promise.resolve({ id: "d1" }) };

function signInAs(user: CurrentUser) {
  auth.requireUser.mockResolvedValue(user);
  auth.getCurrentUser.mockResolvedValue(user);
}

function jsonRequest(method: string, body: unknown) {
  return new Request("http://x/api/documents/d1", {
    method,
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function errorCode(response: Response) {
  const body = (await response.json()) as { error: { code: string; message: string } };
  return body.error;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.document.findUnique.mockResolvedValue(storedDoc);
});

describe("GET /api/documents/[id]", () => {
  it("returns the document with the caller's access", async () => {
    signInAs(users.viewer);
    const response = await GET(new Request("http://x/api/documents/d1"), ctx);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { access: string; updatedAt: string };
    expect(body.access).toBe("viewer");
    expect(body.updatedAt).toBe(updatedAt.toISOString());
  });

  it("returns 404 to a stranger so the id cannot be probed", async () => {
    signInAs(users.stranger);
    const response = await GET(new Request("http://x/api/documents/d1"), ctx);
    expect(response.status).toBe(404);
    expect((await errorCode(response)).code).toBe("NOT_FOUND");
  });

  it("returns 404 for a document that does not exist", async () => {
    signInAs(users.owner);
    db.document.findUnique.mockResolvedValue(null);
    const response = await GET(new Request("http://x/api/documents/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
    expect((await errorCode(response)).code).toBe("NOT_FOUND");
  });

  it("returns 401 without a session", async () => {
    auth.requireUser.mockRejectedValue(unauthenticated());
    const response = await GET(new Request("http://x/api/documents/d1"), ctx);
    expect(response.status).toBe(401);
    expect((await errorCode(response)).code).toBe("UNAUTHENTICATED");
    expect(db.document.findUnique).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/documents/[id]", () => {
  it("rejects a viewer with 403 and never writes", async () => {
    signInAs(users.viewer);
    const response = await PATCH(jsonRequest("PATCH", { title: "Hacked" }), ctx);
    expect(response.status).toBe(403);
    expect((await errorCode(response)).code).toBe("FORBIDDEN");
    expect(db.document.update).not.toHaveBeenCalled();
  });

  it("lets the owner rename the document", async () => {
    signInAs(users.owner);
    db.document.update.mockResolvedValue({ id: "d1", title: "Renamed", updatedAt });
    const response = await PATCH(jsonRequest("PATCH", { title: "  Renamed " }), ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: "d1",
      title: "Renamed",
      updatedAt: updatedAt.toISOString(),
    });
    expect(db.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "d1" }, data: expect.objectContaining({ title: "Renamed" }) }),
    );
  });

  it("returns 400 for a malformed JSON body", async () => {
    signInAs(users.owner);
    const response = await PATCH(jsonRequest("PATCH", "{not json"), ctx);
    expect(response.status).toBe(400);
    expect((await errorCode(response)).code).toBe("VALIDATION_ERROR");
    expect(db.document.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/documents/[id]", () => {
  it("rejects an editor with 403", async () => {
    signInAs(users.editor);
    const response = await DELETE(new Request("http://x/api/documents/d1", { method: "DELETE" }), ctx);
    expect(response.status).toBe(403);
    expect((await errorCode(response)).code).toBe("FORBIDDEN");
    expect(db.document.delete).not.toHaveBeenCalled();
  });
});

describe("POST /api/documents/[id]/shares", () => {
  it("rejects sharing with yourself", async () => {
    signInAs(users.owner);
    db.user.findUnique.mockResolvedValue(users.owner);
    const response = await SHARE(
      jsonRequest("POST", { email: " Owner@Example.com ", role: "VIEWER" }),
      ctx,
    );
    expect(response.status).toBe(400);
    const error = await errorCode(response);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("You can't share a document with yourself.");
    expect(db.documentShare.upsert).not.toHaveBeenCalled();
  });

  it("returns 404 to a stranger even when they share with themselves", async () => {
    signInAs(users.stranger);
    const response = await SHARE(
      jsonRequest("POST", { email: users.stranger.email, role: "EDITOR" }),
      ctx,
    );
    expect(response.status).toBe(404);
    expect(db.documentShare.upsert).not.toHaveBeenCalled();
  });
});
