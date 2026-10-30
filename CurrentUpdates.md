# Current updates: install and verify

Updated: 2026-10-30

Install this update from the verified PR preview or main branch. Confirm the new version in Tampermonkey and reload the watch page.

## Updated userscripts (1)

### YouTube Tools — 2026-10-30_1.5.0

**[Install / update YouTubeTools.user.js](src/YouTubeTools.user.js)**

**UI changes:** Fixes the V1.4 inline speed controls overflowing narrow Android Edge layouts and displacing the video without properly moving its controls and metadata.

Normal watch-page layout:
- Two **44px-wide** speed-step buttons show **«** and **»** chevrons within a single 88px stepper. The current speed label sits **on top of this stepper** with `pointer-events: none`, so it takes no additional column or tap target. Tapping each half changes speed by 0.25x.
- Four equally flexible presets: **0.5x, 1x, 1.5x, 2x**. Android Edge alone adds the **44px ⛶** button at far right; other browsers retain the same bar without it.
- Prefer inserting the toolbar **before the complete YouTube watch-page layout wrapper** (which contains video controls and metadata), rather than immediately above the inner video player. Where that structure is absent, use a common video/metadata parent, then fall back to video-only insertion. This is intended to reserve page height for both the player and the title/details.

Custom Android Edge fullscreen layout:
- The original video player occupies **100% of the fullscreen stage**; it no longer loses a full row to the toolbar.
- Speed controls move into a small semi-transparent **floating region around 56% height, near the left edge**, away from the upper-right Settings gear and upper-left mute buttons. They become clearer on touch focus or hover.
- The **⛶ button disappears completely** in fullscreen. Exit using Android Back, Escape, or the browser fullscreen exit action.
- The orientation lock and 90-degree CSS rotation fallback continue to work for landscape content; player progress, sound and playback rate continue without a new iframe.

Test pages:
- [Affected Ableton / Rachel K Collier YouTube video](https://m.youtube.com/watch?v=zeWBx3AePow)
- [Speed-control test watch page](https://www.youtube.com/watch?v=nCg3aXn5F3M)

Manual verification:
1. Install `YouTubeTools.user.js` version `2026-10-30_1.5.0` in Android Edge (Accessibility 125%) and reload the affected video.
2. Confirm the **single-line** bar fits portrait width. The speed label appears between « and » **inside the same control**; all four speed presets and the rightmost ⛶ remain tappable.
3. Play and unmute. Check that YouTube's gear, captions, volume and other native controls stay within the player instead of covering the added bar, and that the video title and channel information no longer overlap or hide under the video.
4. Tap ⛶. The video should fill the fullscreen height; the bar should become a small, partially transparent **floating speed control near the middle-left**, with no visible fullscreen button.
5. Tap ± or a speed preset, then exit via Android Back and verify speed, video position, page scroll, layout and auto-rotation restoration.
6. Verify Windows Edge and Android Chrome keep the compact **in-flow** speed bar without ⛶. Try both the compact and wide browser layouts.

**Update scope:** Only `YouTubeTools.user.js` needs to be installed. No shared floating controls or game fullscreen scripts have changed.

## Verification limits

`node --test scripts/test-youtube-tools.js` tests stepped speed changes, watch-wrapper and metadata arrangement, CSS hit areas, orientation handling, fullscreen overlay and restoration. The harness does not emulate YouTube's live dynamically positioned control layers or the Android Edge GPU compositor; on-device validation remains necessary.
