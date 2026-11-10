# Architecture

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16 (App Router), TypeScript strict | One repo for UI and API, free Vercel deploys |
| Editor | Tiptap 3 (StarterKit + Placeholder) | Rich text basics out of the box, content as structured JSON |
| Database | Postgres on Neon (free tier) via Prisma 7 + `@prisma/adapter-pg` | Persistent across deploys; Vercel's filesystem is ephemeral so SQLite was not an option |
| Validation | zod 4 | One schema per input, shared by routes and tests |
| Import | `marked` + `@tiptap/html/server` (with `happy-dom`) | Markdown to HTML to Tiptap JSON using the editor's own extensions |
| Tests | Vitest | Fast, runs TS directly, no database needed |

## Data model

- `User`: id, email (unique), name. Three seeded demo users.
- `Document`: title, `content` (Tiptap JSON), `ownerId`, timestamps.
- `DocumentShare`: composite key `(documentId, userId)` and a `role` of `VIEWER` or `EDITOR`. The composite key makes "share again" an upsert, so re-sharing changes the role instead of creating duplicates.

Ownership lives on the document, not in the share table, and an owner can never be a share row. That keeps "who owns this" a single column lookup.

## Access control

All decisions go through `src/lib/access.ts`. `resolveAccess(userId, doc)` is a pure function that returns `owner`, `editor`, `viewer`, or `none`, with `canView`, `canEdit`, and `canManage` on top. Every service function in `src/lib/documents.ts` loads the document with its shares, resolves access, and throws a typed error. Route handlers never make their own access decision, and the UI only hides controls as a convenience.

| Action | Owner | Editor | Viewer | No access |
|---|---|---|---|---|
| Open | yes | yes | yes | 404 |
| Edit or rename | yes | yes | 403 | 404 |
| Share, change role, revoke, delete | yes | 403 | 403 | 404 |

**404 vs 403:** a user with no access gets the same 404 as for a document that does not exist, so ids cannot be probed. People who can already see a document get a 403 when they try something their role does not allow, because hiding its existence from them gains nothing.

**Auth is mocked, authorization is real.** Login is picking one of three seeded users. The session cookie holds the user id signed with HMAC-SHA256 (`SESSION_SECRET`), is httpOnly, and is verified on every request, so it cannot be edited in the browser to become someone else.

## Content storage

I store Tiptap JSON, not HTML. It round-trips formatting exactly, it is validated on save (must be `{ type: "doc" }`, under about 1 MB), and rendering it goes through the editor's schema rather than injecting HTML.

## Autosave

`src/hooks/useAutosave.ts`:
- Content changes are debounced by 1 second.
- At most one PATCH is in flight. Edits made during a save are sent right after it finishes, always with the latest snapshot.
- Requests carry a sequence number so a stale response never changes the status.
- Status: `Unsaved changes` → `Saving...` → `Saved`, or `Couldn't save - Retry`. On failure the content stays in the editor and is retried on the next edit or on Retry. Nothing is dropped.
- A `beforeunload` warning fires while there are unsaved changes, and pending content is flushed when leaving through an in-app link.
- The title saves separately on blur or Enter. Viewers never trigger saves.

## Import pipeline

`POST /api/documents/import` accepts a multipart `file`. `src/lib/import.ts` is pure and unit-tested:
1. Check the extension (`.txt`, `.md`). MIME type is ignored because browsers report `.md` inconsistently.
2. Reject empty files, files over 1 MB, and bytes that are not valid UTF-8.
3. `.txt`: blank-line blocks become paragraphs, single line breaks become hard breaks. The JSON is built directly, so text that looks like HTML stays literal text.
4. `.md`: `marked` to HTML, then `generateJSON` with the **same extension list as the editor**. Anything the editor does not support (images, tables, code blocks, H3+) degrades to plain text instead of failing.
5. Title is the filename without its extension.

## What I prioritized and why

1. **Access control correctness.** It is the part most likely to be wrong in a quick build and the hardest to see from the UI, so it sits in one pure module with a full permission matrix test and route-level tests.
2. **Editing that does not lose work.** Autosave with a visible status and retry, because a docs product that silently drops edits is worse than one with fewer features.
3. **A fast demo path for reviewers.** Seeded users, one-click switching, and a welcome document already shared with Bob, so both dashboard sections show up immediately.

## What I cut and why

- **Real-time collaboration and presence:** needs a sync layer (CRDT or OT plus websockets). Too big for the timebox. Two people editing the same doc is last-write-wins.
- **Real authentication:** not what is being evaluated; mocked login keeps the sharing demo fast.
- **Comments, version history, link sharing, folders, search, images, tables:** each is a feature on its own. I chose depth on the core flow.
- **`.docx` import, export, and stale-write (409) protection:** planned as stretch, cut for time.

## Known limitations

- The build script runs `prisma migrate deploy` before `next build`, and every Vercel deploy uses the same `DATABASE_URL`. So a preview deploy would also apply migrations to the production database. That is acceptable for this scope (one schema, one database, no preview branches in use). With more time I would give previews their own Neon branch.

## What I would build next with 2-4 more hours

1. Stale-write protection: send the loaded `updatedAt` with each save and return 409 if the doc changed, with a "reload to see the latest version" message.
2. `.docx` import via `mammoth` through the same HTML-to-JSON path.
3. Export to Markdown.
4. Browser end-to-end tests (Playwright) for the sharing flow and autosave.
