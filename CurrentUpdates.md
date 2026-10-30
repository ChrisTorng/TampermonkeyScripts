# Current updates: install and verify

Updated: 2026-10-30

## Updated userscripts (1)

### YouTube Tools — 2026-10-30_1.7.1

**[Install / update YouTubeTools.user.js](src/YouTubeTools.user.js)**

**Visible change:** Only the Android Edge **alternative fullscreen** speed-control placement has changed. The speed toolbar now appears **horizontally centered near the top of the video** rather than at the upper-left. This keeps YouTube's left-side mute/unmute button available when the video starts muted. The responsive toolbar retains its 410px maximum width, with a centered `left: 50%` and `translateX(-50%)`, so rotated landscape and physically landscape viewports behave consistently.

**Unchanged:** The custom fullscreen speed controls appear when the viewer taps the player, disappear after **1 second**, and leave no invisible touch layer when hidden. In fullscreen the step arrows and current speed remain in separate 44/48/44px regions; the custom fullscreen entry itself is hidden. On the normal YouTube watch page, the opaque compact toolbar remains below the player, including 0.5x / 1x / 1.5x / 2x presets and the Android Edge-only alternative fullscreen entry button. YouTube native fullscreen/restore controls remain hidden only on Android Edge watch pages. Native playback, mute, CC, gear, seek controls, orientation handling, and Android Back to exit are unchanged.

Test pages:
- [Video used to reproduce the muted fullscreen overlap](https://m.youtube.com/watch?v=zeWBx3AePow)
- [Speed controls regression page](https://www.youtube.com/watch?v=nCg3aXn5F3M)

Verification:
1. Update `YouTubeTools.user.js` to version `2026-10-30_1.7.1` in Tampermonkey and reload YouTube in Android Edge.
2. Mute the video and enter fullscreen using the **custom ⛶** button. Tap the picture and verify the temporary speed bar is centered near the top rather than at upper-left, leaving YouTube's mute/unmute control clear and tappable.
3. Check that the speed bar fully disappears after **1 second**, that the left mute control still responds, and that tapping the video again reopens the bar.
4. Try «, », 0.5x, 1x, 1.5x, and 2x, then leave fullscreen using Android Back. Confirm speed, video time, and normal toolbar position are preserved.
5. Verify the normal watch-page toolbar and Windows Edge / Android Chrome behavior remain unchanged.

**Update scope:** Only YouTubeTools.user.js requires installation.

## Verification notes

`node --test scripts/test-youtube-tools.js` asserts the centered fullscreen CSS geometry, retained one-second visibility behavior, playback-speed changes, and fullscreen exit restoration. Automated DOM testing cannot fully emulate Edge Android's visual compositor or YouTube's live mute controls; a real-device check is still needed.
