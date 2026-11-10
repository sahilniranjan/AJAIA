# Ajaia Docs

A lightweight document editor inspired by Google Docs. You can create and format documents, import `.txt` and `.md` files, and share documents with other users as a Viewer or Editor.

**Live app:** LIVE_URL_TODO

## Demo accounts

Login is mocked: pick a user on the login page. No password.

| User | Email |
|---|---|
| Alice | alice@demo.com |
| Bob | bob@demo.com |
| Carol | carol@demo.com |

Alice owns a welcome document that is already shared with Bob as an Editor, so signing in as Bob shows both dashboard sections right away. Use **Switch user** in the header to change users.

## Features

- Create, rename, edit, and delete documents
- Rich text: bold, italic, underline, H1, H2, bulleted and numbered lists (toolbar and Ctrl/Cmd+B, I, U, undo/redo)
- Autosave with a visible status (`Saved`, `Saving...`, `Unsaved changes`, `Couldn't save - Retry`)
- File import: **`.txt` and `.md` only, up to 1 MB**. Each file becomes a new editable document. Markdown headings (H1, H2), bold, italic, and lists are kept. Anything else (tables, images, code blocks, smaller headings) becomes plain text.
- Sharing by email with **Viewer** (read-only) or **Editor** roles. Owners can change roles and remove access.
- Dashboard split into "Owned by me" and "Shared with me"
- Access rules enforced on the server for every request. A user without access gets "not found", so document ids cannot be probed.

Sample files to import are in `samples/`.

## Run locally

Prerequisites: Node 22+, npm, and a Postgres database (a free [Neon](https://neon.tech) project works).

```bash
git clone https://github.com/sahilniranjan/AJAIA.git
cd AJAIA
npm install
cp .env.example .env      # then fill in the three values below
npm run db:migrate        # creates the tables
npm run db:seed           # creates Alice, Bob, Carol and the welcome document
npm run dev               # http://localhost:3000
```

Environment variables:

| Name | What it is |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string (Neon: the host contains `-pooler`). Used by the app. |
| `DIRECT_URL` | Direct (non-pooled) connection string. Used by Prisma migrations. |
| `SESSION_SECRET` | Long random string that signs the session cookie. Generate with `openssl rand -hex 32`. |

For local Postgres without pooling, set both URLs to the same value.

## Tests

```bash
npm test          # Vitest: access matrix, validation, import conversion, route-level auth checks, session signing
npm run typecheck
npm run lint
```

Tests mock the database, so they do not need a running Postgres.

## Deployment

The app is deployed on Vercel (free tier) with Neon Postgres (free tier).

1. Import the GitHub repo in Vercel. The default build command runs `npm run build`, which runs `prisma migrate deploy` and then `next build`. `postinstall` runs `prisma generate`.
2. Set `DATABASE_URL`, `DIRECT_URL`, and `SESSION_SECRET` in the Vercel project settings.
3. Seed the production database once from your machine, with the production URLs in `.env`: `npm run db:seed`. The seed is idempotent.

## Known limitations

- Login is mocked (three seeded users). Authorization is real and checked on the server.
- No real-time collaboration. If two people edit the same document at the same time, the last save wins.
- No comments, version history, link sharing, folders, search, images, or tables.
- Import supports `.txt` and `.md` only.
- Editing is not optimized for mobile.

See `ARCHITECTURE.md` for design decisions and `AI_WORKFLOW.md` for how AI tools were used.
