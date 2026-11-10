# Walkthrough video script (about 4 minutes)

**0:00 - 0:20 Intro.** "This is Ajaia Docs, a small document editor with file import and role-based sharing. I scoped it to do a few things well: editing that does not lose work, and sharing rules that are enforced on the server."

**0:20 - 1:30 Main flow (as Alice).** Log in as Alice. Show the dashboard sections. Create a doc, rename it, apply bold, italic, underline, H1, H2, and both list types. Point at the save status. Refresh: everything is still there. Import `samples/demo.md` and show headings and lists, then try a wrong file type to show the error.

**1:30 - 2:30 Sharing.** Share with Bob as Viewer. Switch to Bob: "Shared with me" shows the Viewer badge, and the doc is read-only with a banner. Switch back, upgrade Bob to Editor, and show that Bob can now edit. Switch to Carol and paste the URL: not found. Mention that no-access returns 404, not 403, so ids cannot be probed.

**2:30 - 3:10 Decisions and cuts.**
- Tiptap JSON in Postgres, not HTML: exact round-trip and no HTML injection.
- One pure access module, tested as a full matrix.
- Autosave: debounced, one request at a time, keeps content and shows Retry on failure.
- Cut: real-time collaboration, real auth, comments, version history, `.docx`. Next up: stale-write protection, `.docx`, export.

**3:10 - 4:00 How AI helped.**
- A build guide up front, so the AI had a fixed contract and had to stop for review.
- The shared core first, then three parallel agents on separate files.
- One concrete catch: the share route's 404 leak, and how it was fixed and tested.
- The happy-dom case: the agent stopped and asked instead of guessing.
- Close with how it was verified: 61 tests, typecheck, lint, and the live QA run.

## Screenshots to take (`docs/screenshots/`)
1. Login page
2. Dashboard as Bob (both sections)
3. Editor with formatting
4. Share dialog
5. Viewer read-only banner
6. Import error message
