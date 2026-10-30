# Current updates: install and verify

Updated: 2026-10-30

Install this version through the PR's Vercel preview if available, or update from the main branch after merge. Confirm the userscript version in Tampermonkey and reload YouTube.

## Updated userscripts (1)

### YouTube Tools — 2026-10-30_1.3.0

**[Install / update YouTubeTools.user.js](src/YouTubeTools.user.js)**

**UI changes:** The existing playback-speed widget is now **132 × 62 px**, with actual 30 × 30 px step-button hit targets instead of invisible half-width/full-height touch regions, compact 1x/1.5x/2x presets and a non-interactive widget background. On Android Edge the widget is moved left, leaving the far upper-right corner free for the independent draggable 38 × 32 px `⛶` alternative-fullscreen entry control. The fullscreen button continues to use the existing shared transient-control layout; there is no dependency on any floating menu.

For landscape videos (determined by `videoWidth > videoHeight`) played in a portrait phone viewport, the alternate fullscreen wrapper first attempts `screen.orientation.lock('landscape')` **only while in browser fullscreen**. If denied, unavailable, or if the physical viewport remains portrait, CSS rotates the existing YouTube player by 90 degrees and swaps its `100dvw`/`100dvh` dimensions to use the entire portrait viewport sideways. As soon as the browser actually rotates into landscape, the CSS rotation is removed. Portrait videos are never force-rotated; unloaded metadata is detected later. Exit or browser Back restores the original player and releases only a successfully acquired orientation lock.

Test pages:

- [Reported mobile YouTube sample](https://m.youtube.com/watch?v=zeWBx3AePow)
- [Existing YouTube speed test](https://www.youtube.com/watch?v=nCg3aXn5F3M)

Verification:

1. Install/update YouTube Tools to `2026-10-30_1.3.0`, reload the sample in Android Edge (Accessibility 125%).
2. In portrait, confirm the `⛶` button alone occupies the top-right of the player. The reduced speed controls should sit to its left, without invisible wide tappable areas covering the YouTube video; verify minus/plus and 1x/1.5x/2x presets.
3. Tap the new `⛶` button. On a landscape video, check that the phone changes to landscape when Edge permits orientation locking. Otherwise the *video* should rotate 90 degrees to fill the portrait phone screen when held sideways.
4. Exit with Android Back/Escape and confirm the player returns, the orientation lock is released, video progress and speed remain the same, and neither entry control nor speed controls overlap.
5. Test a vertical/portrait YouTube video. It should remain upright and should not attempt landscape lock. Check physical landscape entry, YouTube page navigation, and 100% zoom.
6. Confirm Android Chrome and Windows Edge do not show the alternate fullscreen button and that their compact speed controls remain functional.

**Update scope:** Only YouTubeTools.user.js needs installing. Shared TransientControl.js, FullscreenGameView.user.js, and the other floating-menu consumers are unchanged.

## Verification notes

`node --test scripts/test-youtube-tools.js` exercises the retained speed controls, the Android Edge fullscreen wrapper, CSS button dimensions and placement, 100%/125% zoom, wide and portrait metadata, 90-degree rotated CSS geometry, browser orientation-lock success/denial and cleanup, responsive viewport switching, SPA navigation and Back restoration. These are DOM/CSS-harness tests. Android Edge's compositor and physical orientation lock are still subject to mobile browser behavior and need real-device confirmation.

Screen Orientation API reference: https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock
