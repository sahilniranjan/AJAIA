// Shared API response shapes so the server and client agree on the contract.
import type { Access, ShareRoleValue } from "./access";

export type UserSummary = { id: string; name: string; email: string };

export type OwnedDocumentItem = {
  id: string;
  title: string;
  updatedAt: string;
  shareCount: number;
};

export type SharedDocumentItem = {
  id: string;
  title: string;
  updatedAt: string;
  owner: UserSummary;
  role: ShareRoleValue;
};

export type DocumentListResponse = { owned: OwnedDocumentItem[]; shared: SharedDocumentItem[] };

export type DocumentDetail = {
  id: string;
  title: string;
  content: unknown;
  updatedAt: string;
  access: Exclude<Access, "none">;
  owner: UserSummary;
};

export type PatchDocumentResponse = { id: string; title: string; updatedAt: string };

export type Collaborator = { user: UserSummary; role: ShareRoleValue };

export type ApiError = { error: { code: string; message: string } };
