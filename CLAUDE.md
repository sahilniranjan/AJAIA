# CLAUDE.md - Ajaia Docs (take-home build guide)

This file is the operating manual for building this project. Read it fully before doing anything.
The original assignment brief is saved at `docs/BRIEF.md`. If this file and the brief ever disagree, the brief wins; tell me about the conflict.

---

## 0. How we work together (read first)

You are pairing with Sahil, a software/ML engineer, on a timed take-home for an AI-forward product engineering role. **Sahil owns every product and architecture decision. You implement, advise, and flag risks.**

The reviewers explicitly grade "mature use of AI tools without outsourcing judgment". Everything below exists to make that true in practice, not just on paper.

Working rules:

1. **Work in phases (section 17). Stop at the end of each phase.** Post a checkpoint summary (format in section 17) and wait for me to say "continue". Do not start the next phase on your own.
2. **Plan before code.** At the start of each phase, list the files you will create or change and any decision that needs my input. Keep it short. If nothing needs my input, say so and proceed.
3. **Surface real tradeoffs.** When there is a genuine choice (library, data shape, UX behavior), give me the options in 1-2 lines each with your recommendation. Do not ask about trivial things.
4. **Never claim something works unless you ran it.** "Done" means typecheck, lint, and tests pass and you have stated how you verified behavior. If you could not verify something (for example, a browser-only behavior), say so plainly and give me the manual check.
5. **Stay in scope.** Do not add features outside section 5. If you think something is worth adding, propose it in the checkpoint and let me decide.
6. **Verify library APIs against the installed version.** Next.js, Tiptap, and Prisma have all changed APIs across major versions. Before using an API you are not sure of, check `node_modules` types or the package's own docs for the installed version. Do not write code from memory of an older version.
7. **Keep the AI log (section 18) updated as you go.** It feeds a required deliverable.
8. **Commit at the end of every phase** with a clear conventional-commit message (for example `feat: document sharing with viewer/editor roles`). Never commit secrets.

---

## 1. Mission

Build a lightweight collaborative document editor inspired by Google Docs, deployable for free, within a 4-6 hour timebox.

The goal is a **small, coherent, polished product slice** with deliberate scope cuts that are explained clearly. Depth in a few areas beats shallow coverage everywhere.

What reviewers grade (from the brief):
- Turning an open-ended prompt into a coherent product slice
- Full stack execution: frontend, backend, persistence, access logic
- Quality of the editing experience within scope
- Practical file upload and sharing behavior
- Ability to ship a testable deployed build
- Code clarity, maintainability, delivery discipline
- Prioritization and tradeoff awareness
- Written communication
- Mature AI use

Every decision should be defensible against that list.

---

## 2. Hard constraints

- Total build time target: about 5 hours. If a phase runs long, tell me and suggest what to cut.
- **Reviewers must not pay for anything.** Only free tiers.
- The live URL must work without any sign-up, payment, or setup by the reviewer.
- No secrets in the repo. Use `.env` (gitignored) and commit `.env.example` with placeholders.
- Must persist across refresh and across deployments, so **no SQLite or file storage on Vercel** (its filesystem is ephemeral).

---

## 3. Tech stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (current stable, App Router), TypeScript strict mode | One repo for UI and API, first-class Vercel deploys |
| Styling | Tailwind CSS | Fast, consistent UI without a design system |
| Editor | Tiptap (`@tiptap/react` + StarterKit + Underline + Placeholder, whichever of these the installed major version needs separately) | Rich text basics out of the box, stores content as structured JSON |
| Database | Postgres on Neon (free tier) | Free, persistent, works with serverless |
| ORM | Prisma | Typed schema, migrations, seed script |
| Validation | zod | Shared request validation with typed results |
| Markdown import | `marked` (then convert HTML to Tiptap JSON) | Small, reliable |
| Tests | Vitest | Fast, TS-native |
| Hosting | Vercel (free), connected to the GitHub repo | Auto-deploy on push |

Pick dependency versions that are stable and at least two weeks old. Do not add other dependencies without telling me why in one line.

---

## 4. Users and auth (deliberate scope cut)

Real authentication is out of scope. Use **mocked auth with seeded users**:

- Seed exactly three users: `alice@demo.com` (Alice), `bob@demo.com` (Bob), `carol@demo.com` (Carol).
- Login page shows the three users as cards. Clicking one signs in.
- Session = httpOnly cookie holding the user id, **signed with HMAC (Node `crypto`) using `SESSION_SECRET`**, so it cannot be trivially edited in the browser. Verify the signature on every request.
- Header shows the current user and a "Switch user" control (logs out and returns to the login page). This makes the sharing demo fast for reviewers.
- Every API route resolves the user from the cookie. Missing or invalid session returns 401 and the UI redirects to `/login`.

Be explicit in the docs: the login is mocked, but **authorization is real and enforced server-side on every route.**

---

## 5. Scope

### In scope (core)
1. Create, rename, edit, save, reopen documents
2. Rich text: bold, italic, underline, H1, H2, bulleted list, numbered list (plus undo/redo via keyboard)
3. Autosave with a visible save status
4. File import: `.txt` and `.md` become new editable documents
5. Sharing: owner grants access to another user by email; dashboard splits "Owned by me" and "Shared with me"
6. Roles: `viewer` (read-only) and `editor` (can edit). Small extra cost, strong signal
7. Owner can revoke access and delete a document
8. Validation and friendly error handling everywhere
9. Automated tests on the access logic and the import conversion
10. Live deployment plus all written deliverables

### Stretch (only if core is done and I approve)
- `.docx` import via `mammoth`
- Stale-write protection: client sends the `updatedAt` it last loaded; server returns 409 if the doc changed since, and the UI shows "This document was updated elsewhere. Reload to see the latest version."
- Export to Markdown

### Out of scope (state these in the docs and video)
Real-time collaboration and presence, comments and suggestion mode, version history, real authentication and sign-up, link-based or public sharing, folders, search, images and tables in the editor, mobile-optimized editing.

---

## 6. Product spec

### `/login`
- Title, one-line description of the app, three user cards. A note: "Demo accounts. Sign in as different users to test sharing."

### `/` Dashboard (requires session)
- Header: app name, current user, "Switch user".
- Actions: "New document" button, "Import file" button with helper text **"Supports .txt and .md, up to 1 MB"**.
- Section **Owned by me**: title, last updated (relative time), number of people it is shared with.
- Section **Shared with me**: title, owner's name, role badge (Viewer / Editor), last updated.
- Empty state for each section with a short helpful line.
- Sorted by last updated, newest first.
- Clicking a row opens the document.

### `/docs/[id]` Editor (requires session and access)
- Back link to dashboard.
- Title: inline editable input. Saves on blur and Enter. Empty title falls back to "Untitled document". Max 200 characters.
- Toolbar: Bold, Italic, Underline, H1, H2, Bulleted list, Numbered list. Buttons show **active state** for the current selection. Accessible labels and keyboard shortcuts (Ctrl/Cmd+B, I, U).
- Save status indicator: `Saved` / `Saving...` / `Unsaved changes` / `Couldn't save - Retry`.
- "Share" button, visible only to the owner.
- Role context: owner sees nothing extra; editor sees "Shared with you by {owner} - Editor"; viewer sees a banner "You have view-only access" and the editor and toolbar are read-only, the title is not editable.
- Doc not found or no access: a clean "Document not found or you don't have access" page with a link back. Do not reveal whether the document exists.

### Share dialog (owner only)
- Email input plus role select (Viewer / Editor) plus "Share" button.
- List of current collaborators with role and a "Remove" action.
- Helper text listing the demo emails so reviewers know who to share with.
- Errors shown inline: unknown email, sharing with yourself, invalid email format.
- Sharing with someone who already has access updates their role.

---

## 7. Data model (Prisma)

```prisma
model User {
  id         String          @id @default(cuid())
  email      String          @unique
  name       String
  documents  Document[]      @relation("OwnedDocuments")
  shares     DocumentShare[]
  createdAt  DateTime        @default(now())
}

model Document {
  id         String          @id @default(cuid())
  title      String          @default("Untitled document")
  content    Json            // Tiptap JSON document
  ownerId    String
  owner      User            @relation("OwnedDocuments", fields: [ownerId], references: [id], onDelete: Cascade)
  shares     DocumentShare[]
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  @@index([ownerId])
}

model DocumentShare {
  documentId String
  userId     String
  role       ShareRole
  document   Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime  @default(now())

  @@id([documentId, userId])
  @@index([userId])
}

enum ShareRole {
  VIEWER
  EDITOR
}
```

Notes:
- Store content as **Tiptap JSON, not HTML**. It round-trips formatting exactly and is safer to render.
- New documents start with an empty Tiptap doc: `{ "type": "doc", "content": [{ "type": "paragraph" }] }`.
- Seed script creates the three users plus one welcome document owned by Alice that is already shared with Bob as Editor, so reviewers see both dashboard sections immediately when they log in as Bob. Make the seed idempotent (upsert by email).

---

## 8. Access control (the core of the backend)

All authorization goes through **one module**, `src/lib/access.ts`. No route makes its own access decision.

```ts
type Access = "owner" | "editor" | "viewer" | "none";

// Pure function: no DB, fully unit-testable
function resolveAccess(userId: string, doc: { ownerId: string; shares: { userId: string; role: "VIEWER" | "EDITOR" }[] }): Access

function canView(a: Access): boolean    // owner, editor, viewer
function canEdit(a: Access): boolean    // owner, editor
function canManage(a: Access): boolean  // owner only: share, revoke, delete
```

Plus a thin DB helper that loads the document with its shares and returns `{ doc, access }`.

Permission matrix:

| Action | Owner | Editor | Viewer | None |
|---|---|---|---|---|
| See in dashboard | yes | yes | yes | no |
| Open document | yes | yes | yes | 404 |
| Edit content | yes | yes | 403 | 404 |
| Rename | yes | yes | 403 | 404 |
| Share / change role / revoke | yes | 403 | 403 | 404 |
| Delete document | yes | 403 | 403 | 404 |

Rules:
- `none` always returns **404, not 403**, so users cannot probe which document ids exist.
- An owner can never also appear as a share row.
- The UI hides controls the user cannot use, **but the server is the real enforcement**. Never rely on the UI.

---

## 9. API contract

Use Next.js route handlers. Keep handlers thin: parse and validate, resolve user, call a service function, map errors to responses. Business logic lives in `src/lib/` so it is testable without HTTP.

| Method | Path | Body | Who | Returns |
|---|---|---|---|---|
| POST | `/api/session` | `{ userId }` | anyone | sets cookie |
| DELETE | `/api/session` | none | anyone | clears cookie |
| GET | `/api/users` | none | anyone | seeded users (for login page) |
| GET | `/api/documents` | none | signed in | `{ owned: [...], shared: [...] }` |
| POST | `/api/documents` | `{ title? }` | signed in | new doc |
| GET | `/api/documents/[id]` | none | can view | doc + `access` + owner info |
| PATCH | `/api/documents/[id]` | `{ title?, content? }` | can edit | updated doc (`id`, `title`, `updatedAt`) |
| DELETE | `/api/documents/[id]` | none | owner | 204 |
| GET | `/api/documents/[id]/shares` | none | owner | collaborators |
| POST | `/api/documents/[id]/shares` | `{ email, role }` | owner | upserted share |
| DELETE | `/api/documents/[id]/shares/[userId]` | none | owner | 204 |
| POST | `/api/documents/import` | multipart `file` | signed in | new doc |

Error response shape, everywhere:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable message" } }
```
Codes: `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (400), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_FILE_TYPE` (415), `CONFLICT` (409, stretch only), `INTERNAL` (500, never leak stack traces).

Write one small helper that maps thrown typed errors to these responses so handlers stay consistent.

---

## 10. Validation and error handling

Server side (zod):
- Title: trimmed, max 200 chars; empty becomes "Untitled document".
- Content: must be an object with `type: "doc"`; reject anything else. Cap serialized size at about 1 MB.
- Share: valid email format, role in `VIEWER | EDITOR`, target user must exist, cannot share with yourself.
- Invalid JSON bodies return 400, not 500.

Client side:
- Every fetch handles non-OK responses and shows the server's `message`.
- Failed autosave shows `Couldn't save - Retry` and keeps the unsaved content in the editor. Never silently drop edits.
- Warn on page leave (`beforeunload`) if there are unsaved changes.
- Loading states for the dashboard and editor (simple skeletons or spinners, nothing fancy).

---

## 11. File import spec

- Endpoint: `POST /api/documents/import`, multipart form with field `file`.
- Allowed: `.txt` and `.md` (and `.docx` only if the stretch is approved). Check the **extension**; treat MIME type as a hint only, because browsers report `.md` inconsistently.
- Max size 1 MB. Reject empty files and files that are not valid UTF-8 text.
- `.txt`: each line or blank-line-separated block becomes a paragraph. Preserve line breaks sensibly.
- `.md`: convert with `marked` to HTML, then to Tiptap JSON using Tiptap's HTML-to-JSON utility with the **same extensions as the editor**, so only supported formatting survives (headings, bold, italic, lists, paragraphs). Unsupported markdown such as images or tables degrades to plain text, not errors.
- **Verify early** that the HTML-to-JSON conversion runs in the Node runtime with the installed Tiptap version (it may need a server-specific import). If it does not, stop and tell me the options before choosing one.
- New document title = filename without extension, trimmed to 200 chars.
- On success the UI navigates straight into the new document.
- Put conversion in a pure function `src/lib/import.ts` so it is unit-tested.

---

## 12. Autosave spec

- Debounce content changes by about 1 second, then PATCH.
- Only one request in flight at a time. If edits happen while saving, save again after the current request completes with the latest content.
- Ignore out-of-order responses (track a request sequence number).
- Status transitions: typing → `Unsaved changes` → `Saving...` → `Saved` or `Couldn't save - Retry`.
- Title saves separately on blur or Enter.
- Viewers never trigger saves.
- Keep this logic in a small custom hook (for example `useAutosave`) so the editor component stays readable.

---

## 13. Project structure

```
/
├─ CLAUDE.md
├─ README.md
├─ ARCHITECTURE.md
├─ AI_WORKFLOW.md
├─ SUBMISSION.md
├─ VIDEO_URL.txt
├─ .env.example
├─ docs/
│  ├─ BRIEF.md
│  ├─ ai-log.md
│  ├─ VIDEO_SCRIPT.md
│  └─ screenshots/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ src/
│  ├─ app/
│  │  ├─ login/page.tsx
│  │  ├─ page.tsx                 (dashboard)
│  │  ├─ docs/[id]/page.tsx       (editor)
│  │  └─ api/...                  (route handlers per section 9)
│  ├─ components/                 (Editor, Toolbar, ShareDialog, SaveStatus, DocumentList, ImportButton, Header)
│  ├─ hooks/                      (useAutosave)
│  └─ lib/
│     ├─ access.ts                (pure authorization logic)
│     ├─ session.ts               (signed cookie)
│     ├─ db.ts                    (Prisma client singleton)
│     ├─ documents.ts             (service functions)
│     ├─ import.ts                (file → Tiptap JSON)
│     ├─ validation.ts            (zod schemas)
│     └─ errors.ts                (typed errors → HTTP responses)
└─ tests/
   ├─ access.test.ts
   ├─ import.test.ts
   ├─ validation.test.ts
   └─ documents-api.test.ts
```

Adjust if the installed Next.js version suggests a better convention, but tell me.

---

## 14. Testing

Required (these are the "meaningful automated tests"):

1. `access.test.ts`: full permission matrix from section 8. Owner, editor, viewer, stranger, and the owner-is-never-a-share rule.
2. `import.test.ts`: markdown with H1, H2, bold, italic, bullet and numbered lists converts to the expected Tiptap node types; plain text becomes paragraphs; empty input is rejected; unsupported markdown degrades without throwing.
3. `validation.test.ts`: title trimming and fallback, content shape rejection, share input rules.
4. `documents-api.test.ts`: at least one route-level test proving a **viewer's PATCH is rejected with 403 and a stranger's GET returns 404**. Mock the Prisma layer with `vi.mock` so tests do not need a live database.

Scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `db:migrate`, `db:seed`.

Before every checkpoint run `typecheck`, `lint`, and `test`, and report the results.

---

## 15. Deployment (Vercel + Neon)

You cannot click through the Vercel or Neon dashboards, so **give me exact step-by-step instructions** for the parts I must do manually, and handle everything in code.

- Env vars: `DATABASE_URL` (Neon pooled connection), `DIRECT_URL` (Neon direct connection, used for migrations), `SESSION_SECRET` (long random string). Document all three in `.env.example` and the README.
- Ensure Prisma Client is generated during the Vercel build (for example a `postinstall` script) and migrations are applied safely (for example `prisma migrate deploy` in the build step). Confirm the right approach for the installed Prisma version.
- Seed the production database once from my machine with the production `DATABASE_URL`; document that command.
- **Deploy at the end of Phase 0** with the login page working, before building features. Deployment problems are cheaper to fix early.
- After each later phase, remind me to push so the live URL stays current.

---

## 16. Deliverables (all must exist before we finish)

| File | Contents |
|---|---|
| `README.md` | What the app is (2-3 lines), live URL, demo accounts, features, supported import types, prerequisites, local setup step by step (clone, install, env, migrate, seed, run), test command, deploy notes, known limitations |
| `ARCHITECTURE.md` | Stack and why, data model, access control design and the 404-vs-403 choice, content storage as JSON, autosave design, import pipeline, what I prioritized and why, what I cut and why, what I would build next with 2-4 more hours. Aim for 1-2 pages |
| `AI_WORKFLOW.md` | Tools used, where AI materially sped things up, what AI output was changed or rejected (specific examples from `docs/ai-log.md`), how correctness, UX, and reliability were verified. **You draft it from the log; Sahil edits and writes the reflections. Leave clearly marked `TODO (Sahil):` placeholders for anything that must be in his own words. Never invent incidents that are not in the log.** |
| `SUBMISSION.md` | Exact list of what is included, live URL, GitHub URL, video URL, demo accounts and a 60-second sharing test script for reviewers, what works, what is incomplete, what is next |
| `VIDEO_URL.txt` | Placeholder line until Sahil records the video |
| `docs/VIDEO_SCRIPT.md` | A 4-minute talk-track outline covering: main flow, what works end to end, what was deprioritized, key decisions, how AI helped (helper file, not a required deliverable) |
| `docs/screenshots/` | Remind me which screenshots to take: login, dashboard as Bob (both sections), editor with formatting, share dialog, viewer read-only banner, import error message |

---

## 17. Phases and exit criteria

Time estimates are targets, not hard limits. Tell me if a phase is drifting past them.

**Phase 0 - Foundation and first deploy (45 min)**
Scaffold Next.js with TS strict, Tailwind, ESLint. Prisma schema, Neon connection, initial migration, idempotent seed. Signed-cookie session, login page, protected dashboard shell, Switch user. Vitest configured with one passing smoke test. `.env.example`, `.gitignore`. Create `docs/ai-log.md` and `docs/BRIEF.md` (ask me to paste the brief).
Exit: live Vercel URL where I can sign in as each user and see an empty dashboard.

**Phase 1 - Documents and editor (1.5 hr)**
Document service and routes (create, list, get, patch, delete). Dashboard list with owned section and New document. Editor page with Tiptap, toolbar with active states, inline title rename, `useAutosave` with status indicator, unsaved-changes warning.
Exit: create, format, rename, refresh, reopen; formatting is identical after reload.

**Phase 2 - Sharing and roles (1 hr)**
`access.ts` plus its full test file. Wire every route through it. Share routes and Share dialog. Shared with me section with owner and role badge. Viewer read-only mode with banner. Revoke and delete.
Exit: Alice shares with Bob as Viewer, Bob can read but not edit (UI and API both enforce it), Alice upgrades Bob to Editor and Bob can edit, Carol gets "not found" for the same URL.

**Phase 3 - File import (40 min)**
`import.ts` plus tests, import route, Import button with helper text and inline errors.
Exit: a sample `.md` file with headings and lists opens as a correctly formatted editable doc; wrong type, oversize, and empty files show clear messages. Commit a `samples/` folder with a demo `.md` and `.txt` for reviewers.

**Phase 4 - Hardening (40 min)**
Validation and route tests, error-mapping consistency, loading and empty states, a pass over accessibility basics (labels, focus states, keyboard shortcuts), remove dead code and console logs. Run the QA script in section 21 against the **live** URL with me.
Exit: all tests green, QA script passes on production.

**Phase 5 - Deliverables (45 min)**
Draft all files in section 16. Fill in real values (URLs, accounts). Draft the video script.
Exit: every row of section 16 exists; I have reviewed and edited AI_WORKFLOW.md myself.

**Checkpoint format (post this at the end of every phase):**
```
## Phase N checkpoint
What I built: (bullets)
Files changed: (list)
Decisions made: (each with one-line reason; flag any you made without asking)
Verification: typecheck / lint / test results + what I checked manually
How you can verify it yourself: (2-4 concrete steps)
Known issues or risks: (honest list, or "none")
AI log entries added: (count + one-line summaries)
Suggested commit message:
Next phase preview: (2-3 lines)
```

---

## 18. AI log protocol (`docs/ai-log.md`)

This log is the raw material for `AI_WORKFLOW.md` and the video. It must be honest and specific.

Add an entry whenever:
- You make a non-obvious technical decision
- You catch and fix a bug in your own earlier output
- A library API differed from what you first assumed
- Sahil rejects, corrects, or redirects something you proposed (ask him for a one-line reason if he did not give one)

Entry format:
```
### YYYY-MM-DD HH:MM - Short title
- Context: what we were doing
- AI proposed: what you suggested or generated
- Outcome: kept / changed / rejected
- Why: the reasoning
- Verified by: test, manual check, docs lookup
```

Remind Sahil at each checkpoint to add entries for any corrections he made outside this chat.

---

## 19. Code quality rules

- TypeScript strict, no `any` unless justified in a comment.
- Small, focused components and functions. Business logic in `src/lib`, never inside JSX or route handlers.
- Comments explain **why**, not what.
- No dead code, commented-out code, or stray `console.log` at checkpoints.
- Consistent naming; files named after their main export.
- Every user-facing string clear and in plain English.
- Accessible by default: buttons have labels, inputs have labels, focus is visible.
- Do not over-engineer: no state management libraries, no custom design system, no abstractions with a single caller.

---

## 20. Writing style for all docs and UI copy

- Plain, direct, human. Short sentences. No marketing language ("seamless", "robust", "leverage", "cutting-edge").
- **Never use em dashes or en dashes.** Use a single hyphen, a comma, a colon, or a new sentence instead.
- Be honest about limits. State what is incomplete rather than hiding it.
- Write the docs as Sahil's own notes in first person ("I chose", "I cut"), since he will submit them.

---

## 21. Final QA script (run against the live URL)

1. Open the live URL in an incognito window. Login page loads.
2. Sign in as Alice. Welcome doc is in "Owned by me".
3. Create a new document. Rename it. Type text and apply bold, italic, underline, H1, H2, bullet list, numbered list.
4. Watch the status go to `Saved`. Refresh. Everything is identical.
5. Import `samples/demo.md`. It opens with correct headings and lists. Try a `.pdf` or an oversized file and confirm the error message.
6. Share the new doc with `bob@demo.com` as Viewer.
7. Switch user to Bob. Doc appears in "Shared with me" with owner Alice and a Viewer badge. Opening it shows the read-only banner and editing is blocked.
8. Switch to Alice, change Bob to Editor. Switch to Bob, edit, refresh, edit persists.
9. Copy the doc URL, switch to Carol, paste it. "Not found or no access" page appears.
10. As Alice, revoke Bob. As Bob, the doc is gone from the dashboard and its URL returns not found.
11. Run `npm test` locally. All green.

---

## Start here

1. Confirm you have read this file.
2. Ask me to paste the brief into `docs/BRIEF.md`.
3. Tell me the versions of Next.js, Tiptap, and Prisma you plan to install and anything in this file that conflicts with those versions.
4. Post your Phase 0 plan and wait for my go-ahead.
