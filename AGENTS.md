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
- **index.html** is build output and must not be committed (it is gitignored). CI and Vercel run `npm run generate:index` (via `scripts/generate-index.js`) to rebuild it from **README.md** and convert raw GitHub links to relative paths. Run the command locally only for testing; ensure the file stays untracked.

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
- Whenever modifying any script that has a floating control, consider all floating controls together. Keep their appearance, placement, dragging, toggle behavior, active-state feedback, and page-CSS isolation consistent rather than implementing script-specific variants.
- The page-wide controls use one page-anchored layout contract: `position: absolute`, 44 × 34 px, 50% opacity, a viewport-relative initial right-edge position, and 10 px vertical gaps. Geometry and opacity are inline `!important` styles so host-page CSS cannot resize or displace them.
- Active toggle controls use a green `rgba(34, 139, 34, 0.85)` background, white text, and `aria-pressed="true"`; inactive controls use the shared dark background and `aria-pressed="false"`.
- Preserve unique consecutive slots: slot 0 → (`AllGoInternetArchive` / `InternetArchive` fallback), slot 1 ↔ (`ForceMobileView`), slot 2 🌙 (`ForceDarkMode`), and slot 3 譯∞ (`TranslatePreformattedText`). Their top offsets are `70 + slot × 44` px.
- When adding, removing, reordering, or resizing a floating control, update every affected script's shared styling helper and the corresponding runtime layout/interaction assertions in `scripts/test-*.js` together.
