# Current updates: install and verify

Updated: 2026-10-30

Install the userscript from the deployment preview or from the main branch after merge, then reload YouTube.

## Updated userscripts (1)

### YouTube Tools — 2026-10-30_1.6.0

**[Install / update YouTubeTools.user.js](src/YouTubeTools.user.js)**

**UI changes:** The compact speed stepper and presets remain, but the normal YouTube watch-page toolbar now mounts **after the player and directly before the metadata/title** (when the metadata element is available). It no longer inserts before the video, since the video and YouTube's independent absolute-positioned native control layers were getting displaced inconsistently. The row has a partly transparent background if the site's own title area still overlaps. Android Edge alone keeps the dedicated `⛶` button; Windows Edge/Android Chrome have the same speed row without it.

**Alternative fullscreen:**
- Move the **outer YouTube mobile player host** into the custom fullscreen root instead of only `.html5-video-player`, so sibling native control components (such as captions, settings, progress and play/pause) remain within the fullscreen subtree. The original DOM nodes are restored after leaving fullscreen.
- The YouTube speed toolbar no longer stays visible on top of the video. It starts **completely hidden, including its tap targets**. Tap the fullscreen player once to reveal a small speed bar at the **upper-left (12px inset)**, and it automatically disappears after 3.5 seconds. Touching the player still delivers its normal YouTube gesture; the script does not intercept play/pause or seeking.
- No extra `⛶` exit button is shown during fullscreen; exit via the browser's Back gesture or native fullscreen exit.
- Retain existing landscape orientation-lock and CSS 90-degree rotation fallback, plus video timing/speed continuity.

Test pages:

- [Reported mobile YouTube clip](https://m.youtube.com/watch?v=zeWBx3AePow)
- [Original speed test](https://www.youtube.com/watch?v=nCg3aXn5F3M)

Manual verification:

1. Update `YouTubeTools.user.js` to `2026-10-30_1.6.0`, reload YouTube on Android Edge at Accessibility 125%, and start playback with sound enabled.
2. Check the row **under** the original video, ahead of the title/metadata. The player should not move down; YouTube's gear, captions and progress should remain within the player. If the title area itself overlaps the row, the row remains translucent rather than obscuring everything.
3. Tap `⛶`. The whole video should display without the speed bar taking height. Check the YouTube native **play/pause, captions CC, settings gear and progress scrubber** after tapping the player.
4. Tap anywhere in the fullscreen player: the speed row should appear **near the upper-left**, then disappear again after 3.5 seconds. Verify there is no invisible hit area covering the player while hidden.
5. Adjust speed, exit using the Android Back gesture, then check video position, rate, orientation and normal-page toolbar restoration.
6. Verify Windows Edge/Android Chrome still show the compact speed bar below the video, with no custom fullscreen button.

**Update scope:** Only `YouTubeTools.user.js` requires installation. The Game View and other shared scripts remain unchanged.

## Verification notes

`node --test scripts/test-youtube-tools.js` exercises DOM placement below video/above metadata, native mobile control preservation in custom fullscreen, speed adjustment, tap-to-reveal behavior, orientation handling and restoration. The mock DOM does not fully represent YouTube's current mobile layout, fullscreen control state machine or the Edge GPU compositor; physical-device checks are required before considering those fixed.
