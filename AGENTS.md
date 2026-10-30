# Project Agent Guide (AGENTS.md)

This repository hosts various Tampermonkey user scripts. Follow these rules to keep them consistent.

## 1. Script versioning
- Whenever any `.user.js` script changes, **update its metadata `@version`**.
- **Format**: `YYYY-MM-DD_Major.Minor.Patch` (e.g., `2025-11-30_1.0.0`). Fetch the current date programmatically; do not guess.

## 2. Documentation sync
- Keep **[README.md](README.md)** script entries concise—brief descriptions only, avoid unnecessary detail.
- For every script addition, update, or removal, review and adjust **README.md** so the script list stays accurate while remaining concise.
- Keep each script’s Tampermonkey `@description` in sync with its **README.md** entry; update the metadata whenever README descriptions change.
- Update **[TestCases.md](TestCases.md)** when site-specific scripts change so their test URLs remain aligned. **Site-agnostic scripts do not require TestCases entries.**
- **index.html**, **TestCases.html**, and **CurrentUpdates.html** are generated output and must not be committed (they are gitignored). CI and Vercel run `npm run generate:index` (via `scripts/generate-index.js`) to rebuild them from Markdown and convert documentation and raw GitHub links to relative paths. Run the command locally only for testing; ensure generated files stay untracked.

## 3. Language
- All code, comments, and documentation in this repository must be written in **English**.

## 4. Communication
- Communicate with users in Traditional Chinese using Taiwan phrasing unless they explicitly request another language.

## 5. Automated testing
- When a captured-page item in **[TestCases.md](TestCases.md)** has enough local data to validate script behavior, add or maintain an automated test for it.
- Use the built-in Node test runner in a **VS Code Testing compatible format**:
  - Put tests in `scripts/test-*.js`.
  - Use `node:test` with explicit `test(...)` and/or `describe(...)` blocks so VS Code Testing can discover them.
  - Keep the full suite runnable with `node --test`.
- Prefer runtime-style tests that **inject the userscript into a local DOM harness and assert behavior**. Avoid static string checks when direct execution is feasible.
- If a script depends on Tampermonkey-specific APIs or browser-only APIs, mock only the minimal surface needed for the test and keep the mocked behavior explicit in the test file.
- Anti-bot, auth-only, or non-HTML captures may still use automated tests, but only for logic that can be validated locally (for example redirect rules, URL decisions, metadata detection, or session behavior). Do not label those cases as full-content coverage unless the content-dependent behavior is actually exercised.
- Keep **[TestCases.md](TestCases.md)** synchronized with the current automated coverage:
  - Mark each listed item with an explicit test status.
  - Use a short reason when coverage is limited, blocked, mocked, or intentionally not direct.

## 6. Shared floating controls
- Keep the `≡` menu, its actions, dragging, active-state feedback, and page-CSS isolation consistent across floating-control scripts. Follow [FloatingMenu.md](FloatingMenu.md).
- Edit `src/FloatingMenu.js` as the canonical shared implementation, then run `node scripts/sync-floating-menu.js` to copy it into every participating `.user.js`. Review and test all consumers after any shared change.
- Register each action with a stable key in `FLOATING_MENU_ORDER`; do not depend on userscript startup order. Only the menu handle stores position. A missing or unavailable action must not leave an empty menu visible.
- Keep host exclusions and the site-disable setting coordinated across the menu scripts. Preserve URL-based automatic activation independently of whether the menu is expanded.
- The independent fullscreen entry button follows `≡` document anchoring during pinch zoom, matches its dimensions and translucent styling, and avoids overlapping any visible menu. Do not place it in `FLOATING_MENU_ORDER` or couple its releases to the five menu scripts; see [FloatingMenu.md](FloatingMenu.md).

## 7. Short update notes and direct test links
- For every functional change, update **[CurrentUpdates.md](CurrentUpdates.md)**. Keep it **very short**: list each changed `.user.js` with its exact `@version`, a direct repository-relative `src/<name>.user.js` install link, one or two short change notes, and a few direct test URLs with brief expected outcomes. Include a reload instruction if needed. Omit lengthy background, repeated explanations, implementation history, and boilerplate.
- Keep **README.md** linked to CurrentUpdates.md. For shared-source changes, list all synchronized userscripts and explicitly state when they must be updated together.
- **PR descriptions must contain the relevant test page URLs as direct clickable links, with a very short expected-result note for each.** Never require the user to open `TestCases.md`, `CurrentUpdates.md`, or another file to locate test links. Also include direct installation links for **every** modified userscript and the exact versions; supporting Markdown links are optional and never a replacement for direct test links.
- **User-facing completion replies must also provide the applicable test URLs directly**, not only a link to a PR or documentation page. Keep these replies concise.
- Use public pages that demonstrate the change, or a small local fixture where needed. Link local fixtures relatively in the repository and directly from the PR, so they work on deployed previews.
- `CurrentUpdates.html`, `TestCases.html`, and `index.html` remain generated and untracked. Build normally with `npm run generate:index`; never commit them.
- Never invent a preview URL. If a verified deployment URL exists, include it briefly; otherwise use direct source/test URLs without adding placeholder preview links.
