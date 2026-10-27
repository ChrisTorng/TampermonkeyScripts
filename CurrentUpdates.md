# Current updates: install and verify

Updated: 2026-10-27

Open this page on the PR's Vercel preview to install that preview's versions. After merging, the same page lists the updates in production. Click each installation link below, confirm the version in Tampermonkey, then reload the test page.

## Updated userscripts (1)

### Fullscreen Game View — 2026-10-27_1.0.5

**[Install / update FullscreenGameView.user.js](src/FullscreenGameView.user.js)**

**UI changes:** The dim gray fullscreen entry button can be dragged within its visible game area without activating fullscreen; its position resets on reload. The button disappears in native fullscreen and the expanded fallback: there is no close button. Exiting restores the pre-entry page position, focus, ancestor scroll offsets, and game scroll offsets instead of jumping to the page top. Escape exits fullscreen; Escape or browser Back restores the fallback view. Ancestor scrollers also limit the entry button's visible position.

Test pages:

- **[Local fullscreen test canvas](tests/ControlButtons/index.html#test-game)** — a stable test page requiring no account or external game.
- [ARC Prize game task](https://arcprize.org/tasks/ls20)

Verification:

1. On the local page, find **Fullscreen**. The canvas has a dim gray `⛶` button near its upper-right corner.
2. Drag the button with a mouse or finger. Releasing it must not enter fullscreen.
3. Scroll down to the canvas and, on ARC Prize, move any game or outer-container scrollbars. Click to enter fullscreen. Verify that neither `⛶` nor a close button covers the fullscreen content. Press **Esc** to exit: the page must remain at the original horizontal and vertical scroll position, with the same game/container offsets and entry-button location. It must not jump to the top. If native fullscreen is unavailable, verify the same restoration after **Esc** or browser **Back** from the expanded fallback.
4. Reload the page: the button returns to its default location.

## Verification notes

Automated coverage includes native fullscreen state events, page/ancestor/game scroll restoration, focus restoration, late browser resets, and rapid re-entry. Native APIs are mocked in DOM tests. A headless Chromium test checks actual fallback scrolling with smooth scrolling enabled, hidden expanded controls, and Escape/Back restoration; frame scheduling, event delivery, and the rejected native request are explicit test substitutions. Physical-device gestures still require manual verification.
