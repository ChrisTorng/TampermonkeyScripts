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

## 7. Current update installation and verification
- For every functional change, update the fixed **[CurrentUpdates.md](CurrentUpdates.md)** page in the same change. Keep **README.md** linked to this page near the top. Replace stale entries when starting a new change; keep all modified userscripts listed while extending the same pull request.
- List every modified `.user.js` with a clickable repository-relative `src/<name>.user.js` installation link and its exact metadata version. Include every synchronized consumer when shared source changes. Clearly identify any group that must be updated together.
- For each item, provide clickable test pages, a brief description of visible UI changes, and short manual steps with expected results. Include installation/reload instructions so users can install and verify the new version without searching the full script list.
- Use existing suitable public test pages or maintain a small local test page when a stable reproduction is needed. Link local test pages relatively so they work on the current branch's Vercel preview and after merging.
- Generate **CurrentUpdates.html** from the same Markdown during the normal build; verify that README navigation, userscript installation links, and test links resolve within the same deployment. Keep generated HTML untracked.
- In each PR description, include the current-update page, direct installation links for **every changed userscript**, and each script's test pages and brief expected UI checks. Read Vercel's actual preview URL from its deployment status or PR comment; never invent an unverified hostname. When the preview is not available, link the branch's `CurrentUpdates.md` as the fallback. After deployment becomes available, update the PR with verified preview links.
