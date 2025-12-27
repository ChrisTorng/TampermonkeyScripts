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
- Whenever **README.md** changes, run `npm run generate:index` (powered by `scripts/generate-index.js`) to rebuild **[index.html](index.html)** from the full README content and convert every link that starts with `https://github.com/ChrisTorng/TampermonkeyScripts/raw/main` to a relative path (e.g., `/src/TheNeuronDaily.user.js`).

## 3. Language
- All code, comments, and documentation in this repository must be written in **English**.
