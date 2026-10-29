# Current updates: install and verify

Updated: 2026-10-30

Open this page on the PR's Vercel preview to install that preview's version. After merging, the same page lists the update in production. Click the installation link below, confirm the version in Tampermonkey, and reload the test page.

## Updated userscripts (1)

### YouTube Tools — 2026-10-30_1.1.0

**[Install / update YouTubeTools.user.js](src/YouTubeTools.user.js)**

**UI changes:** The existing YouTube playback-speed overlay remains unchanged. On Android Edge only, entering fullscreen at non-default page zoom now attempts inverse scaling and up/left position compensation. The script estimates zoom from the unzoomed screen and page viewport (or browser text-scale where available), leaves detected 100% alone, and uses 125% only when measurement is unavailable. The original fullscreen styles are restored upon exit. This is an experimental workaround for a Chromium compositor bug and requires live Android Edge validation.

Test pages:

- [Affected live-looping YouTube video](https://m.youtube.com/watch?v=zeWBx3AePow)
- [Existing YouTube speed-controls test](https://www.youtube.com/watch?v=nCg3aXn5F3M)

Verification:

1. Install or update YouTubeTools.user.js in Tampermonkey; confirm version `2026-10-30_1.1.0` and reload YouTube.
2. In Android Edge Settings > Accessibility, set zoom to 100%, open the affected video, and enter fullscreen. Video framing must remain unchanged, and playback-speed controls must still work.
3. Set zoom to 125%, reload the video, and enter fullscreen in landscape orientation. Check whether the left black offset and right/bottom clipping are reduced or removed. Repeat in portrait.
4. Exit fullscreen and confirm the normal YouTube page layout is unchanged. Try 1x, 1.5x, 2x and the step controls again.
5. Verify that Android Chrome and Windows Edge are unaffected.

**Update scope:** Only YouTubeTools.user.js needs installation. No shared floating-menu scripts have changed.

## Verification notes

`node --test scripts/test-youtube-tools.js` exercises the existing speed controls and fullscreen overlay plus Android Edge zoom detection, 100% no-op, 125% correction, fallback, pinch protection, platform isolation, and style restoration using a local DOM harness. This does not prove that Android Edge's native video compositor obeys CSS transforms; only a physical-device test can establish that.
