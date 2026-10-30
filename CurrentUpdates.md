# Current updates: install and verify

Updated: 2026-10-30

Install the userscript from the PR preview or from main after merge, confirm the metadata version in Tampermonkey, and reload the YouTube watch page.

## Updated userscripts (1)

### YouTube Tools — 2026-10-30_1.7.0

**[Install / update YouTubeTools.user.js](src/YouTubeTools.user.js)**

**Visible changes:**
- Normal playback: the compact speed toolbar remains **below the player and above metadata/title**, but now uses a fully **opaque dark background** because it occupies its own row. The central speed indicator still overlays the two half-width step buttons here to save space. The existing four presets (0.5x, 1x, 1.5x, 2x) remain.
- Alternative Android Edge fullscreen: tapping the player reveals the speed toolbar in the **upper-left for just 1 second**, then it fully disappears and stops intercepting taps. Each new tap retriggers the 1-second display; touching a speed button also refreshes the timer. It does not pause video or cancel YouTube's own tap handler.
- In alternative fullscreen, the **left step button («), current speed, and right step button (»)** each have their own **44 / 48 / 44 CSS-pixel** area, so the speed text does not visually cover the arrows. Normal portrait watch pages retain the compact overlapping speed label.
- On **Android Edge watch pages only**, hide YouTube's own fullscreen **and restore/exit-fullscreen** entry buttons (including desktop-style `.ytp-fullscreen-button` and known mobile player/button variants). Do not hide other native controls: play/pause, CC, settings gear, mute/volume, or timeline. Other browsers retain YouTube's standard fullscreen controls.
- Keep existing custom fullscreen orientation lock, CSS 90-degree rotation fallback, original player DOM restoration, speed, playback position and Android Back navigation.

Test pages:
- [YouTube video reported for Android Edge](https://m.youtube.com/watch?v=zeWBx3AePow)
- [Speed-controls test video](https://www.youtube.com/watch?v=nCg3aXn5F3M)

Verification:
1. In Android Edge with Accessibility scaling 125%, update YouTubeTools.user.js to `2026-10-30_1.7.0`, reload the video and verify the **opaque** bar beneath the player, with the speed label centered between «/» without taking an additional column.
2. Confirm YouTube's native fullscreen/restore icon is hidden but the Tampermonkey `⛶` button on the far right of the normal toolbar still works. The YouTube gear, CC, timeline and pause buttons must remain visible and functional.
3. Enter the alternative fullscreen view. The speed toolbar should be **entirely absent** until touching the video. Tap to reveal, and verify it disappears **after 1 second**.
4. While visible, verify the left arrow, separate speed indicator and right arrow do not overlap; select 0.5x / 1x / 1.5x / 2x and check speed still changes without restarting the video.
5. Exit using Android Back or browser gesture, and check the original speed bar, page layout, progress and orientation restoration.
6. Test on Windows Edge or Android Chrome to confirm **no native YouTube fullscreen controls are suppressed** and the compact opaque toolbar still works.

**Update scope:** Only `YouTubeTools.user.js` needs installation. `FullscreenGameView.user.js` and the shared floating menu are unchanged.

## Verification limits

`node --test scripts/test-youtube-tools.js` covers the timer duration, fullscreen overlay state, separated speed display, Android Edge-only native-button selector scope, speed presets, orientation handling and navigation restoration. The captured DOM test does not prove selectors match every current YouTube mobile release or reproduce browser compositor behavior, so Android Edge real-device confirmation is needed.
