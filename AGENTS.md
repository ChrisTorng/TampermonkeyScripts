# Project Agent Guide (AGENTS.md)

This repository hosts various Tampermonkey user scripts. Follow these rules to keep them consistent.

## 1. Script versioning
- Whenever any `.user.js` script changes, **update its metadata `@version`**.
- **Format**: `YYYY-MM-DD_Major.Minor.Patch` (e.g., `2025-11-30_1.0.0`). Fetch the current date programmatically; do not guess.

## 2. Documentation sync
- For every script addition, update, or removal, review and adjust **[README.md](README.md)** so the script list and descriptions stay accurate.
- Update **[TestCases.md](TestCases.md)** when site-specific scripts change so their test URLs remain aligned. **Site-agnostic scripts do not require TestCases entries.**
- Keep **[index.html](index.html)** aligned with README links whenever any `.user.js` is added, updated, or removed.

## 3. Language
- All code, comments, and documentation in this repository must be written in **English**.
