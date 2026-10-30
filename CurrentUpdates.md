# Current updates: install and verify

Updated: 2026-10-30

## Updated userscripts (1)

### YouTube Tools — 2026-10-30_1.8.0

**[Install / update YouTubeTools.user.js](src/YouTubeTools.user.js)**

**UI changes:**
- On Windows and other wide or landscape layouts, **«**, the **current speed**, and **»** are now separate side-by-side controls; the speed display does not overlap either arrow. The combined region is 144 CSS px wide (44 + 56 + 44).
- Only **narrow portrait touch screens** (width at most 600 CSS px, portrait orientation, coarse pointer) retain the existing 88px compressed layout with the current speed display overlaid between the arrows. The Android Edge custom fullscreen still uses its existing 44 + 48 + 44 separated layout.
- All available buttons now show a **background-color hover response** on pointer hover, including step controls, speed presets and the custom fullscreen entry.
- The **currently selected preset** (0.5x, 1x, 1.5x or 2x) is highlighted and **disabled**; clicking the active preset does not change playback speed. A rate not matching a preset (e.g. 1.25x) leaves all presets available.
- The selected state is synchronized on script-driven speed changes, native YouTube playback-speed changes (`ratechange`), and video element changes caused by YouTube navigation.

**Unchanged:** The opaque normal watch-page row is below the player. On Android Edge the independent fullscreen button remains on the right; its native YouTube fullscreen suppression, centered temporary fullscreen speed overlay, one-second hide delay, orientation handling and Android Back behavior are unchanged. Android Chrome and Windows Edge keep their native YouTube fullscreen buttons.

Test pages:
- [YouTube playback-speed test video](https://www.youtube.com/watch?v=nCg3aXn5F3M)
- [Android Edge alternative fullscreen test](https://m.youtube.com/watch?v=zeWBx3AePow)

Verification:
1. Install YouTubeTools.user.js version `2026-10-30_1.8.0` in Tampermonkey and reload YouTube.
2. On **Windows Edge**, verify «, the live speed value and » have three visually distinct cells without overlapping; hovering over unselected buttons changes the background.
3. At 1x, the **1x preset** should be highlighted and disabled. Click 1.5x, then 2x and confirm the highlight moves; selecting the active preset again must not reset playback or write the same rate.
4. Use « and » to reach a rate such as 1.25x: no preset should remain selected. Change playback rate through YouTube's original Settings menu to verify the new selected preset is reflected.
5. On **portrait Android Edge** at Accessibility 125%, verify the compact speed indicator remains overlaid without clipping any of 0.5x / 1x / 1.5x / 2x / custom ⛶. Rotate the device landscape and check the expanded spacing.
6. Enter custom fullscreen on Android Edge and verify the pre-existing one-second centered overlay and Back-to-exit behavior are unaffected.

**Update scope:** Only YouTubeTools.user.js needs installation.

## Verification notes

`node --test scripts/test-youtube-tools.js` covers live speed-state behavior, selected-preset disabling, width-specific CSS rules, hover CSS, fullscreen handling, and restoration. The DOM harness cannot produce real browser screenshots; verify the actual widths in desktop Edge and narrow Android Edge on a physical device.
