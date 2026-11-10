# AI workflow

Raw entries with timestamps are in `docs/ai-log.md`. This note summarizes them.

## Tools used

- **Claude Code (Claude Opus 5.5)** in VS Code, as the main pair programmer.
- **Parallel sub-agents** inside Claude Code: three ran at once on separate files once the shared core was in place.
- TODO (Sahil): list any other tools you used (IDE assistant, ChatGPT, and so on), or delete this line.

## How I set it up

Before any code, I wrote a build guide (`CLAUDE.md`) that fixed the scope, data model, permission matrix, API contract, and the phases. The AI had to stop at each phase for my review, verify library APIs against the installed versions instead of from memory, and log every non-obvious decision. When the deadline got tighter, I cut the plan to 2 hours and switched to parallel agents.

TODO (Sahil): one or two sentences in your own words on why you set it up this way.

## Where AI materially sped things up

- **Scaffolding and boilerplate:** config, Prisma schema, seed, session signing, and error mapping took minutes.
- **Parallel build:** I had the AI write the shared contract first (types, errors, access, validation, the documents service, and the editor extension list). Then three agents built the API routes and tests, the editor and autosave, and the import pipeline and dashboard, all at the same time. This only worked because each agent owned separate files and coded against one fixed contract.
- **Tests:** 61 tests, covering the full permission matrix, validation rules, import conversion, and route-level 401/403/404 checks with a mocked database.

## What AI output I changed or rejected

- **A 404 leak in agent-written code.** The share route checked "can't share with yourself" before checking access, so a stranger got 400 instead of 404. That breaks the rule that no-access always looks like not-found. The ordering came from the brief I gave the agent; the agent flagged it in its report. I moved the check after the access check and added a test.
- **Markdown import dependency.** The agent probed Tiptap's server HTML parser before building on it. It failed because it needs `happy-dom`. The agent stopped and gave options instead of picking a workaround, and I chose to install the documented peer dependency.
- **Versions.** The default would have pulled packages released days earlier. I required stable releases at least two weeks old, TypeScript 5.9 over 7.0, and ESLint 9 over 10 because `eslint-config-next` depends on a plugin that targets ESLint 9. TODO (Sahil): confirm
- **Prisma 7 config.** My original plan assumed `url` and `directUrl` in `schema.prisma`. The installed Prisma 7 types showed that field no longer exists, so URLs moved to `prisma.config.ts` with a pg driver adapter.
- **An install workaround with a side effect.** Installing with `--legacy-peer-deps` silently skipped vitest's `vite` peer. I caught it on the first test run and installed `vite` explicitly.
- **Neon feedback report not sent.** The Neon agent skill told the agent to quietly send Neon a feedback report after the task. It was not sent, because that sends data off my machine without permission.
- **Unused Neon packages removed.** `neon init` added `neon.ts` plus `@neon/config` and `@neon/env` as runtime dependencies with `^` ranges. The app never used them, so I had them removed to keep the stack minimal and versions pinned.
- TODO (Sahil): add anything you corrected yourself outside the chat.

## How I verified correctness, UX, and reliability

- **Correctness:** access rules live in one pure function with a full matrix test. Route tests call the real handlers and assert that a viewer's PATCH is 403 with no DB write, and that a stranger's GET is 404. Typecheck (strict), lint, and tests ran after every integration step.
- **API assumptions:** checked against `node_modules` types for the installed versions (Prisma config, Tiptap StarterKit contents, marked's return type).
- **Reliability:** I reviewed the autosave hook by hand: one request in flight, latest snapshot wins, content kept on failure with Retry. TODO (Sahil): confirm
- **UX:** TODO (Sahil): describe the manual QA run on the live URL (section 21 of `CLAUDE.md`) and anything you changed after trying it.

## Reflection

TODO (Sahil): two or three sentences in your own words: what you would delegate to AI again, and what you would not.
