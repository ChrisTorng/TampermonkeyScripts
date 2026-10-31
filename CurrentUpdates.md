# Current updates

Updated: 2026-10-31

## CloudMark — 2026-10-31_1.3.0

[Install CloudMark.user.js](src/CloudMark.user.js) · Reload BetaCat after updating.

- Open cached category menus immediately; refresh in the background without clearing active input.
- Close immediately on selection; update badges after saving, or show Retry / Choose category on failure.

**Test pages:**
- [Latest](https://hackernews.betacat.io/) / [Chinese](https://hackernews.betacat.io/zh) — choose a category and continue browsing immediately.
- [Local demo](tests/CloudMark/index.html) — delayed responses and simulated save failures; no real writes.
