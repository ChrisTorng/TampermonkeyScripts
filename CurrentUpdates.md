# Current updates: install and verify

Updated: 2026-10-26

Open this page on the PR's Vercel preview to install that preview's versions. After merging, the same page lists the updates in production. Click each installation link below, confirm the version in Tampermonkey, then reload the test page.

## Updated userscripts (2)

### Translate Preformatted Text — 2026-10-26_1.5.5

**[Install / update TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js)**

**UI changes:** The small `譯` button appears at the bottom right of the visible part of each code block, including blocks inside horizontal or vertical scrollers. It can be dragged without triggering translation; its position resets on reload.

Test pages:

- [GitHub: Fermat's Last Theorem](https://github.com/anthropics/fermats-last-theorem)
- [Local control test page](tests/ControlButtons/index.html)

Verification:

1. On GitHub, find **The statement**. Before moving its horizontal scrollbar, verify that the first code block's `譯` is visible and clickable near its lower-right visible corner.
2. Scroll the block left, halfway, all the way right, then back left. The button stays in the visible block area, above the scrollbar.
3. Drag the button with a mouse or finger. Releasing it must not translate the block. Click once to convert the block and again to restore it.
4. Scroll the page and resize the window. The button stays within the visible part of its block. Reload to restore its default position.

### Fullscreen Game View — 2026-10-26_1.0.3

**[Install / update FullscreenGameView.user.js](src/FullscreenGameView.user.js)**

**UI changes:** The fullscreen and exit icons use a dim gray foreground and subdued border. The button can be dragged within its visible game area without activating fullscreen; its position resets on reload. Ancestor scrollers also limit its visible position.

Test pages:

- **[Local fullscreen test canvas](tests/ControlButtons/index.html#test-game)** — a stable test page requiring no account or external game.
- [ARC Prize game task](https://arcprize.org/tasks/ls20)

Verification:

1. On the local page, find **Fullscreen**. The canvas has a dim gray `⛶` button near its upper-right corner.
2. Drag the button with a mouse or finger. Releasing it must not enter fullscreen.
3. Click it to enter fullscreen, then click the gray `×` to exit. If native fullscreen is unavailable, the expanded fallback should still open and close.
4. Reload the page: the button returns to its default location.

## Verification notes

Automated coverage includes nested scrollport clipping, scrollbar clearance, translation conversion, dragging without activation or persistent storage, and source synchronization. A headless Chromium test checks real layout and hit testing at multiple horizontal scroll positions, using an explicit timer substitute for animation frames and explicit scroll-event delivery. Physical-device gestures still require manual verification.
