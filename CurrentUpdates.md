# Current updates: install and verify

Updated: 2026-10-30

Install the new userscript version from the PR preview after deployment or from the main branch after merge. Confirm the version in Tampermonkey and reload YouTube.

## Updated userscripts (1)

### YouTube Tools — 2026-10-30_1.2.0

**[Install / update YouTubeTools.user.js](src/YouTubeTools.user.js)**

**UI changes:** The failed Android Edge fullscreen zoom/offset hack has been removed. Android Edge watch pages now show an independent draggable `⛶` fullscreen button, matching Fullscreen Game View's 38 × 32 px translucent styling, document-anchored pinch zoom behavior, and floating-menu avoidance. The button does not join the shared floating menu. Other browsers retain the existing playback-speed overlay unchanged.

Clicking the new button moves the **existing** YouTube player (not a separate iframe) into a viewport-filling container and asks **that container** to enter browser fullscreen, bypassing YouTube's own fullscreen mechanism. If browser fullscreen is rejected, an in-page CSS viewport-fill fallback remains. Escape or the browser Back button exits, restoring the original player, video position, scroll and playback speed. The entry button is hidden in fullscreen. An existing generic Fullscreen Game View button on this page is temporarily hidden to avoid duplicate controls.

Test pages:

- [Reported Android Edge YouTube clip](https://m.youtube.com/watch?v=zeWBx3AePow)
- [Existing YouTube speed-control test](https://www.youtube.com/watch?v=nCg3aXn5F3M)

Verification:

1. In Android Edge, update YouTubeTools.user.js to `2026-10-30_1.2.0`, keep Accessibility zoom at 125%, and reload the affected video.
2. Tap the **new small translucent ⛶ button near the upper-right of the video**, not YouTube's existing fullscreen icon. Check that the left/right and bottom of the video are not cropped in landscape. Repeat at 100%.
3. Use the original 1x, 1.5x, 2x playback-speed controls. They should still affect the same video and should not restart or lose position.
4. Exit using Android Back or Escape; the page, video position and controls should return without changing playback speed.
5. On Android Chrome and Windows Edge, verify the new button is absent and the original speed controls work as before.

**Update scope:** Only YouTubeTools.user.js needs to be installed. Shared TransientControl.js and FullscreenGameView.user.js remain unchanged; scripts/sync-transient-controls.js now includes YouTubeTools as an additional consumer.

## Verification notes

`node --test scripts/test-youtube-tools.js` verifies Android Edge-only button behavior, native fullscreen on our wrapper instead of the YouTube player, 100%/125% fallback setup, preservation of playback rate/time, generic button suppression, Escape/Back exit and SPA cleanup. The shared transient-control implementation was copied from src/TransientControl.js.

The DOM harness cannot prove whether the real Android Edge browser compositor is correctly centered at 125%. If the own-container fullscreen still crops, the next fallback should be **CSS-only viewport-fill** (without invoking requestFullscreen), which may leave the browser toolbar visible. Embedded YouTube iframes are not used because autoplay restrictions and a second playback instance make state restoration unreliable.
