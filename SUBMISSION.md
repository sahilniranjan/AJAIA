# Submission - Ajaia Docs

- **Live app:** https://ajaia-tawny-alpha.vercel.app/
- **Source (GitHub):** https://github.com/sahilniranjan/AJAIA.git
- **Google Drive folder:** DRIVE_URL_TODO
- **Walkthrough video:** VIDEO_URL_TODO (also in `VIDEO_URL.txt`)

## What is included

| Item | Location |
|---|---|
| Source code | this folder (`src/`, `prisma/`, `tests/`) |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| Raw AI usage log | `docs/ai-log.md` |
| Video link | `VIDEO_URL.txt` |
| Sample import files | `samples/demo.md`, `samples/demo.txt` |
| Screenshots | `docs/screenshots/` |
| Automated tests | `tests/` (61 tests, run with `npm test`) |

## Demo accounts

No password. Pick a user on the login page.

- Alice - alice@demo.com
- Bob - bob@demo.com
- Carol - carol@demo.com

## 60-second sharing test

1. Open the live URL and sign in as **Alice**. Click **New document**, give it a title, and type some formatted text.
2. Click **Share**, enter `bob@demo.com`, choose **Viewer**, and click **Share**.
3. Click **Switch user** and sign in as **Bob**. The doc is under "Shared with me" with a Viewer badge. Open it: there is a view-only banner and it cannot be edited.
4. Switch to **Alice**, open the doc, Share, and change Bob to **Editor**. Switch to **Bob**: he can now edit, and changes persist after a refresh.
5. Copy the doc URL, switch to **Carol**, and open it: "Document not found or you don't have access".
6. Import `samples/demo.md` from the dashboard to see file import.

## What works

- Create, rename, edit, autosave, reopen, delete documents
- Bold, italic, underline, H1, H2, bulleted and numbered lists, with formatting preserved after reload
- `.txt` and `.md` import into new documents, with clear errors for wrong type, empty, oversized, or non-UTF-8 files
- Sharing by email with Viewer and Editor roles, role changes, revoke
- Owned and shared sections on the dashboard
- Server-side access checks on every route (404 for no access, 403 for role limits)
- Deployed on free tiers (Vercel + Neon)

## What is incomplete

- Login is mocked (by design for this scope)
- No real-time collaboration: concurrent edits are last-write-wins
- Not covered by automated tests: browser-only behavior (toolbar active states, `beforeunload` warning, dialog focus). TODO (Sahil): confirm these were checked manually on the live URL.

## What I would build next with 2-4 more hours

1. Stale-write protection (409 with a "reload to see the latest version" message)
2. `.docx` import via `mammoth`
3. Export to Markdown
4. Playwright end-to-end tests for sharing and autosave
