# Current updates

Updated: 2026-10-31

## Force Mobile View — 2026-10-31_2.1.2

[Install ForceMobileView.user.js](src/ForceMobileView.user.js) · Reload the page after updating.

- Android: detect tiny text; apply early mobile layout on Stack Exchange Data Explorer.
- Improve line heights, reduce excessive page overflow, and preserve the ↔ manual switch. Further layout refinement may be needed.

**Test pages:**
- [Data Explorer query](https://data.stackexchange.com/stackoverflow/query/1926661#graph?t=1) — check text size, wrapping, scrolling, and ↔ on/off.
- [Tiny-font example](https://lcamtuf.coredump.cx/prep/index-old.shtml) — check readable text.
- [Hacker News](https://news.ycombinator.com/item?id=46255285) / [Archive Today](https://archive.is/75aY9) — verify existing URL-based behavior.

Only `ForceMobileView.user.js` needs updating; shared floating-menu scripts are unchanged.
