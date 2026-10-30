# Current updates: install and verify

Updated: 2026-10-30

This experimental change updates **only Force Mobile View**. Install from the pull request's branch while testing. No other floating-menu userscript is changed; the shared `src/FloatingMenu.js` source remains untouched until the Android pilot is accepted.

## Updated userscripts (1)

### Force Mobile View — 2026-10-30_2.1.0

**[Install / update ForceMobileView.user.js](src/ForceMobileView.user.js)**

**Visible changes:** On Android, previously unmatched pages with sustained genuinely tiny text may enable a guarded auto-readability mode. Old desktop-style layouts (including Stack Exchange Data Explorer's original 980px page) are evaluated using the layout/physical width ratio and visual viewport scale, not merely a single small label. Auto mode injects a reversible device-width viewport only when no viewport meta exists, uses scoped responsive CSS and text adjustments, and enlarges the existing floating menu's hit targets and spacing **from within this one userscript**, without editing the shared menu source or other userscripts. Existing explicitly matched URL behavior remains unchanged.

**Safety/rollback:** Auto mode avoids legacy global `body *` overrides. If a measured viewport fix fails or the document develops substantial horizontal overflow, it restores the previous styling and records a temporary tab-level suppression. Clicking the ↔ button while automatic mode is active disables it and saves a per-site preference; clicking again enables the existing manual mode and clears that preference.

**Test links:**
- [Stack Exchange Data Explorer — legacy 980px query page](https://data.stackexchange.com/stackoverflow/query/1926661#graph?t=1)
- [Previously problematic tiny-font article](https://lcamtuf.coredump.cx/prep/index-old.shtml)
- [Hacker News comment page — existing URL auto-enable](https://news.ycombinator.com/item?id=46255285)
- [Archive Today — existing URL auto-enable](https://archive.is/75aY9)
- [Steve Blank article — line-height regression reference](https://steveblank.com/2026/04/09/nowhere-is-safe/)

**Verify on Android Edge:**
1. Install this one userscript from the branch/PR link, confirm `2026-10-30_2.1.0` in Tampermonkey, and reload the Stack Exchange query page.
2. Confirm a previously tiny desktop layout is readable without manually expanding the ≡ menu. Open the menu, tap ↔, close and reopen it; adjacent controls and the × button should not overlap while automatic mode is active.
3. Inspect SQL editor input, graph, results table, scrolling, page width, and orientation changes. Intended in-widget horizontal scrolling is acceptable; full-page horizontal scrolling or missing content is not.
4. Tap ↔ to disable automatic mode and confirm the original layout returns; tap it again to enable the existing manual Force Mobile View mode.
5. Compare a normally responsive article (which should stay unmodified) and the previously tiny-font article. Confirm Windows Edge does not auto-enable from the new detector.

**Scope and limitations:** Only this userscript is changed. This is a browser-behavior pilot: Node tests mock viewport reflow and cannot substitute for live Android Edge testing. The automatic failure checker examines horizontal document overflow and persisted unreadable scale; visual element collisions on arbitrary third-party sites are not yet exhaustively detected. On existing explicitly matched URLs, the prior manual-style auto-enable behavior is retained.

## Verification notes

Run `node --test scripts/test-force-mobile-view.js` and `node --test`. New tests cover high-confidence legacy detection, small caption non-triggering, sustained tiny text, Windows exclusion, rollback, and per-site opt-out. The shared floating menu implementation and four other participating scripts are unchanged.
