# Current updates

Updated: 2026-10-31

## CloudMark — 2026-10-31_1.0.0

[Install CloudMark.user.js](src/CloudMark.user.js) · Reload BetaCat after installing.

- Save each topic's original URL, title, and summary without leaving the page; show saved/retry states.
- First save: enter your Cloudmark collection URL/name and write token. Change them later via Tampermonkey → CloudMark settings.

**Test pages:**
- [Latest](https://hackernews.betacat.io/) / [Chinese](https://hackernews.betacat.io/zh) / [Dated](https://hackernews.betacat.io/daily/2026-10-29/) — one save button after each topic.
- [Local demo](tests/CloudMark/index.html) — test save/settings with an in-memory API; no real writes.
