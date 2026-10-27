# Current updates: install and verify

Updated: 2026-10-28

Open this page on the PR's Vercel preview to install that preview's versions. After merging, the same page lists the updates in production. Click each installation link below, confirm the version in Tampermonkey, then reload the test page.

## Updated userscripts (2)

### Fullscreen Game View — 2026-10-28_1.0.6

**[Install / update FullscreenGameView.user.js](src/FullscreenGameView.user.js)**

**UI changes:** The independently draggable fullscreen entry button now matches the `≡` menu handle's 38 × 32 px size, semi-transparent background, light foreground, 5 px rounded corners, shadow, and darker hover state. Pinch zoom or pan no longer pulls the entry control into the zoomed visual viewport; inverse scaling keeps it compact on screen. When both controls occupy the same area, the fullscreen entry button moves beside the menu instead of overlapping it. The entry control remains hidden throughout native fullscreen or fallback; Escape/Back restores scrolling and focus.

Test pages:

- **[Local fullscreen test canvas](tests/ControlButtons/index.html#test-game)** — no external game required.
- [ARC Prize game task](https://arcprize.org/tasks/ls20)

Verification:

1. On a phone, open the test canvas or ARC Prize game. Compare the compact, translucent `⛶` entry button against the separate `≡` menu handle.
2. Pinch zoom and pan the page. `⛶` stays at its original document position and retains a compact screen footprint rather than chasing the visible region. Return to normal zoom to resume positioning.
3. With both controls present, drag `≡` close to `⛶`, then expand its menu. The controls must not overlap; the fullscreen button is still outside the menu and both remain independently draggable.
4. Enter fullscreen and exit using Escape (or browser Back in fallback mode). The fullscreen entry button stays hidden while expanded. Its position, focus, and scroll offsets restore on exit. Reloading resets the fullscreen button's temporary drag position.

### Translate Preformatted Text — 2026-10-28_1.5.6

**[Install / update TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js)**

The embedded transient-control helper was synchronized. Existing per-block translation controls retain their visual-viewport-following behavior and independent temporary drag positioning. The shared `≡` menu implementation has not changed.

Test pages:

- [Local translation and fullscreen controls](tests/ControlButtons/index.html)
- [GitHub code/preformatted blocks](https://github.com/anthropics/fermats-last-theorem)

Verification: Scroll through a long code block and pinch zoom. The `譯` control still tracks the visible part of the block, while the fullscreen control does not chase the zoomed visual viewport.

**Update scope:** These two scripts embed the same transient-control helper and should be synchronized. The `≡` menu and its four other userscripts are unchanged: **there is no requirement to update the entire five-script floating-menu group together** for this change.

## Verification notes

Automated DOM-harness tests cover document anchoring and inverse scaling during zoom, collision avoidance, unchanged translation behavior, fullscreen state transitions, and scroll/focus restoration. Headless browser assertions cover native CSS appearance and fallback controls. Phone pinch gestures still require manual validation.
