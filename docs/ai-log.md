# AI log

Raw notes on how AI (Claude Code) was used while building this. Feeds `AI_WORKFLOW.md`.

### 2026-11-10 01:05 - Dependency versions checked against the registry, not memory
- Context: picking versions for Next.js, Tiptap, Prisma, and the rest.
- AI proposed: queried npm for each package and picked the newest stable release at least two weeks old (cutoff 2026-10-27): Next 16.4.3, Tiptap 3.32.0, Prisma 7.10.1, zod 4.6.7, marked 18.1.2, vitest 5.0.5, Tailwind 4.3.3.
- Outcome: kept.
- Why: the build guide requires stable, two-week-old versions. Several packages had releases from the last few days that would have been picked by default.
- Verified by: `npm view <pkg> time`.

### 2026-11-10 01:06 - Flagged that Prisma 7 changes the planned config
- Context: the build guide assumed `url` and `directUrl` in `schema.prisma`.
- AI proposed: in Prisma 7, connection URLs move to `prisma.config.ts` and the runtime client needs a driver adapter. Options were `@prisma/adapter-neon` or `@prisma/adapter-pg`; recommended `adapter-pg` to avoid lock-in to Neon's driver.
- Outcome: Sahil approved `@prisma/adapter-pg`.
- Why: Neon's pooled URL already handles serverless connections; plain pg keeps local dev on any Postgres.
- Verified by: reading `node_modules/@prisma/config/dist/index.d.ts`. The `Datasource` type only has `url` and `shadowDatabaseUrl`, no `directUrl`. So `prisma.config.ts` points migrations at `DIRECT_URL`, and `src/lib/db.ts` uses the pooled `DATABASE_URL` via `PrismaPg`.

### 2026-11-10 01:06 - TypeScript 5.9.3 instead of the newest 7.0
- Context: TypeScript 7.0.2 was the newest stable release.
- AI proposed: pin 5.9.3 because Next.js and typescript-eslint are tested against the 5.x line, and a tooling surprise is expensive under a timebox.
- Outcome: Sahil approved.
- Why: risk reduction over novelty.
- Verified by: typecheck and lint pass on 5.9.3.

### 2026-11-10 01:09 - Timebox cut from about 5 hours to 2 hours
- Context: the portal timer showed about 3h40m left; Sahil then set a hard 2-hour target.
- AI proposed: a compressed phase plan (P0 25m, P1 35m, P2 25m, P3 15m, P4+P5 20m), cutting all stretch work and skeleton loaders, and folding validation tests into the other phases.
- Outcome: changed. Sahil redirected to a 2-hour target and asked for parallel agents.
- Why: hard deadline.
- Verified by: n/a (planning decision).

### 2026-11-10 01:10 - ESLint 9 instead of ESLint 10
- Context: installing lint tooling.
- AI proposed: pin ESLint 9.39.5 rather than 10.13.0.
- Outcome: kept.
- Why: `eslint-config-next@16.4.3` depends on `eslint-plugin-react@^7.37`, which targets ESLint 9.
- Verified by: `npm view eslint-config-next@16.4.3 dependencies`; `npm run lint` runs clean.

### 2026-11-10 01:11 - npm install crash with vitest 5, and a missing peer
- Context: installing dev dependencies.
- AI proposed: first install failed with an npm internal error (`Cannot read properties of null (reading 'edgesOut')`) while resolving vitest's optional peers. Retried vitest alone with `--legacy-peer-deps`.
- Outcome: changed. That skipped vitest's `vite` peer, so `npm test` failed with `Cannot find package 'vite'`. Fixed by installing `vite@8.3.5` explicitly (within vitest's `^6 || ^7 || ^8` peer range).
- Why: npm arborist bug with this peer set; the workaround had a side effect I caught on the first test run.
- Verified by: `npm test` passes (4 session tests).

### 2026-11-10 01:14 - Shared contract written first, then three parallel agents
- Context: Sahil asked to use multiple agents to go faster.
- AI proposed: write the shared modules first (errors, session, auth, access, validation, types, documents service, editor extensions), then run three agents on separate files: (A) API routes and access/validation/route tests, (B) editor page with toolbar, autosave and share dialog, (C) import pipeline and dashboard.
- Outcome: kept.
- Why: agents running at the same time in one folder conflict unless each owns separate files and they all code against one fixed contract. The editor extension list is shared so imports can only produce formatting the editor can display.
- Verified by: typecheck passed on the shared core before the agents started.

### 2026-11-10 01:14 - StarterKit trimmed to the supported formatting
- Context: Tiptap 3 StarterKit now bundles Underline and Link (it did not in v2).
- AI proposed: use StarterKit alone (no separate Underline package) and disable link, code, codeBlock, blockquote, strike, horizontalRule, and limit headings to H1/H2.
- Outcome: kept.
- Why: keeps the editor and the markdown import to the formatting in scope, so imported markdown degrades to text instead of producing nodes the toolbar cannot edit.
- Verified by: grep of `node_modules/@tiptap/starter-kit/dist/index.d.ts` for `underline` and `link`.

### 2026-11-10 01:17 - Caught a 404 leak in agent-written share route
- Context: reviewing the API agent's share route.
- AI proposed: the sub-agent added a "can't share with yourself" check in the route, before the access check, as my brief told it to.
- Outcome: changed. A stranger posting their own email got 400 instead of 404, which breaks the rule that no-access is always 404. Moved the check into `shareDocument` after the access check and added a test: a stranger self-sharing gets 404 and no DB write happens.
- Why: my own brief to the agent had the ordering wrong; the agent flagged the side effect in its report and I fixed it.
- Verified by: `tests/documents-api.test.ts` (new stranger case), 48 tests passing.

### 2026-11-10 01:16 - Tiptap server HTML parser needs happy-dom
- Context: markdown import converts marked HTML to Tiptap JSON on the server.
- AI proposed: the import agent probed `@tiptap/html/server` before building on it, as the guide requires. It failed: the server build imports `happy-dom`, a peer dependency that was not installed. The agent stopped and listed options (install happy-dom, use jsdom, hand-write a token walker, convert on the client).
- Outcome: Sahil chose installing `happy-dom@20.14.6`.
- Why: it is the peer Tiptap documents, keeps the same-extensions guarantee, and adds no custom code.
- Verified by: a probe test calling `generateJSON` with the editor extensions in vitest's node environment passed after install. Also noted: marked 18 returns `string | Promise<string>`, so it needs `{ async: false }`.

### 2026-11-10 01:19 - Tiptap 3 editor API differences found by the editor agent
- Context: building the editor, toolbar, and autosave.
- AI proposed: the editor agent checked the installed Tiptap 3 types instead of relying on v2 habits.
- Outcome: kept, with these findings:
  - `useEditor` with `immediatelyRender: false` (required for SSR) returns `Editor | null`, so the toolbar renders only once the editor exists.
  - v3 no longer re-renders on every transaction (`shouldRerenderOnTransaction` defaults to false), so toolbar active states use `useEditorState({ editor, selector })`.
  - The React Compiler lint rules in `eslint-plugin-react-hooks` 7 rejected a self-calling `useCallback` in the first autosave draft. The flush was rewritten as a loop.
  - Under StrictMode, closing the native `<dialog>` in effect cleanup closed it right after opening, so the cleanup close was removed.
- Why: these are v3 and React 19 behaviors that older examples get wrong.
- Verified by: typecheck and lint. I also hand-reviewed `useAutosave` for single-flight, latest-snapshot, and no-drop-on-failure behavior. Browser behavior (Escape, beforeunload, active states) is still to be checked manually.

### 2026-11-10 01:19 - Markdown import degradation decisions by the import agent
- Context: making unsupported markdown degrade to text.
- AI proposed: marked 18 renderer overrides take token objects, so it used a local `new Marked({ async: false, renderer })` to avoid changing global defaults. Images render as their alt text (the schema would otherwise leave an empty paragraph). Table rows become paragraphs with cells joined by " | " (otherwise a table collapses into one run-on line). H3 and below become paragraphs. Raw HTML in markdown stays literal text. NUL characters are stripped because Postgres JSON rejects them.
- Outcome: kept.
- Why: imports should never fail or lose text because of formatting the editor does not support.
- Verified by: 13 tests in `tests/import.test.ts`.

### 2026-11-10 01:20 - Full check after merging agent work
- Context: integrating three agents' output.
- AI proposed: run typecheck, lint, all tests, and `next build` together.
- Outcome: kept. All clean, 61 tests passing, build succeeds. Fixed one lint warning on the 401 redirect (kept a full reload on purpose so client state from the previous user is cleared).
- Verified by: command output.

### 2026-11-10 01:30 - Neon setup and real-database QA
- Context: connecting the app to Sahil's Neon project with the Neon CLI and agent skills.
- AI proposed: ran `neon init` and `neon deploy`. Neon wrote `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) into `.env`, not `.env.local` as expected, because `.env` already existed. Mapped `DIRECT_URL` to the unpooled value without printing it, and let `prisma.config.ts` fall back to `DATABASE_URL_UNPOOLED`. Removed the earlier fallback from the direct URL to the pooled URL, because the Neon skill warns that Prisma Migrate over PgBouncer fails with "prepared statement already exists".
- Outcome: kept Prisma and `@prisma/adapter-pg`, as CLAUDE.md requires. The Neon postgres skill agrees: pooled for the app, direct for migrations.
- Why: one env file for Prisma CLI, seed, and Next.js.
- Verified by: `prisma migrate deploy` applied; the seed ran twice with no duplicates. Then I ran a curl script against `next start` with the real database: login, create, content round-trip, viewer PATCH 403, editor PATCH 200, editor DELETE 403, stranger 404 (API and page), tampered cookie 401, share errors (self, unknown, bad email), role upgrade, revoke, delete, and md import (H1, H2, paragraph, bullet and ordered lists) plus pdf/empty/oversize errors. All matched the spec.
- Bug found: my first QA script failed every login because zsh does not word-split `$VAR`, so it was rerun under bash. That was a test-script bug, not an app bug.
- Small fix: invalid content returned zod's default "Invalid input: expected "doc"". Replaced it with "Content must be a document."

### 2026-11-10 01:31 - Neon skill feedback report not sent
- Context: following the Neon agent skill after setting up the database.
- AI proposed: the skill tells the agent to quietly run `neon feedback --message ...` after the task to send Neon a report.
- Outcome: rejected. Not sent.
- Why: it sends data off my machine without my permission, and I had not asked for it.
- Verified by: no `neon feedback` command was run in the session.

### 2026-11-10 01:33 - Unused Neon packages and neon.ts removed
- Context: `neon init` changes to the repo.
- AI proposed: `neon init` added `neon.ts` plus `@neon/config` and `@neon/env` as runtime dependencies with `^` ranges. The AI flagged that the app never imports them and that the ranges break the pinned-versions rule, and recommended removing them.
- Outcome: Sahil had them removed.
- Why: keep the stack minimal and versions pinned. The Neon CLI works without them.
- Verified by: `grep "@neon/"` finds nothing in `package.json` or the lockfile; typecheck, lint, and 61 tests pass.
