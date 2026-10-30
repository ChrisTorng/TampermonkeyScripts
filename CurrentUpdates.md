# Current updates: install and verify

Updated: 2026-10-30

Install the latest userscript from this page on the PR preview or the main branch after merging. Reload the YouTube watch page after the update.

## Updated userscripts (1)

### YouTube Tools — 2026-10-30_1.4.0

**[Install / update YouTubeTools.user.js](src/YouTubeTools.user.js)**

**UI changes:** Removed the fixed/floating YouTube speed overlay and the floating alternative-fullscreen entry control. A real full-width **one-row toolbar** is now inserted in normal document flow **immediately before the player**, below YouTube's header. This avoids obscuring YouTube's top-bar Search button, player's Settings gear, captions and other player interactions.

Toolbar order: **− / current speed / + / 0.5x / 1x / 1.5x / 2x / ⛶ (Android Edge only)**. The controls are 43–44 CSS px touch targets; the current speed is always displayed. When the page is narrow, the speed group scrolls horizontally, while the 44 px fullscreen button stays visible at the far right without overlapping any video controls. Desktop and other Android browsers receive the same in-flow speed toolbar **without** the alternative-fullscreen button.

The existing Android Edge workaround is preserved: the **same** YouTube player is reparented into a custom fullscreen root, with the toolbar placed **above** it rather than covering it. When the browser cannot rotate a landscape video, the stage (toolbar + player) rotates together through 90°. Exit or Android Back restores both the player and toolbar to their original document positions and retains video playback rate/time.

Test pages:

- [Reported YouTube mobile player](https://m.youtube.com/watch?v=zeWBx3AePow)
- [Speed control regression test](https://www.youtube.com/watch?v=nCg3aXn5F3M)

Verification:

1. Update Tampermonkey YouTube Tools to `2026-10-30_1.4.0` and reload the sample watch page in Android Edge, Accessibility 125%.
2. Confirm YouTube's header has its usual search/menu buttons, and a new full-width speed toolbar appears **between header and video**. No new button should sit on the video's Settings/captions controls. Use − and +, inspect current speed, and tap each preset (0.5x/1x/1.5x/2x).
3. Tap the rightmost `⛶` button; verify the video enters the existing alternative fullscreen layout. Controls should remain in a separate row above the video without overlapping it. If the device remains physically portrait for a landscape video, the whole stage should rotate 90°.
4. Use Android Back or Escape and verify original video position, current playback speed, toolbar placement, and normal scrolling. Repeat on another watch page to exercise YouTube SPA navigation.
5. On Windows Edge and Android Chrome, verify the **same in-flow toolbar**, no extra `⛶`, and unchanged native YouTube fullscreen behavior.
6. On a narrow mobile viewport where some speed presets do not fit, swipe horizontally **only within the speed group**; the Android Edge fullscreen button should remain available at the far right.

**Update scope:** Only `YouTubeTools.user.js` must be installed. `src/TransientControl.js` and FullscreenGameView.user.js are unchanged. The synchronizer has been updated to stop embedding the no-longer-needed draggable control in YouTube Tools.

## Verification notes

`node --test scripts/test-youtube-tools.js` covers the in-flow sibling ordering, normal and custom-fullscreen controls, touch target sizing, speed display/presets, desktop/mobile browser differences, 90° stage rotation and orientation-lock fallback, Escape/Back restoration, and YouTube SPA navigation. Headless tests cannot prove that the current mobile YouTube DOM structure and Android Edge compositor behave identically on a physical device.

Orientation API: https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock
