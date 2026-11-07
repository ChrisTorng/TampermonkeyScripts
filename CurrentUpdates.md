# Current updates

## Claude Artifact Clipboard Bridge — 2026-11-07_0.1.0 (experimental)

[Install ClaudeArtifactClipboardBridge.user.js](src/ClaudeArtifactClipboardBridge.user.js) · Reload the Claude page after installing.

- A separate proof of concept: show "To Clipboard Viewer" only when a Claude content iframe confirms readable text; transfer a safe styled HTML snapshot through Tampermonkey storage without opening its signed URL.
- Original translation script remains unchanged. HTML/text formatting is preserved selectively; interactive widgets, canvas, external stylesheets, and Shadow DOM are not copied.

**Test pages:**
- [Claude Artifact](https://claude.ai/artifact/L8qsMc3SorytGW3LA81nYf) — if the sandboxed frame is injectable, a transfer button appears after loading; pressing it opens [Clipboard Viewer](https://christorng.idv.tw/InfoProcess/Clipboard/) with imported English content for browser translation.
- [Unrelated site](https://aatishb.com/blog/) — no new controls, network requests, or behavior changes.

**Note:** Android Edge/Tampermonkey injection and browser translation are unverified; this experimental build is not merged.

Updated: 2026-11-07

## Responsive Scroll Position Indicator — 2026-11-07_1.3.16

[Install ResponsiveScrollIndicator.user.js](src/ResponsiveScrollIndicator.user.js) · Reload after updating.

- Use one solid light gray (#C5C9CE) with no gradient or blur, including on long indicators.
- Protect the fill from global dark-mode CSS; retain screen-edge positioning and collapsed-menu visibility.

**Test pages:**
- [Pangram Image 1.0](https://www.pangram.com/blog/introducing-pangram-image-1-0) — closed contents: no inner bar; expanded contents: solid gray bar; outer bar stays solid gray and flush-right.
- [IndieWeb POSSE](https://indieweb.org/POSSE) — solid gray page marker remains visible after scrolling stops.

## RedirectUrls — 2026-11-01_1.6.2

[Install RedirectUrls.user.js](src/RedirectUrls.user.js) · Reload open X/viewer pages after updating.

- Replace the large toolbar with a separate compact floating → below ≡; no page/header layout changes. Click for Meowing, then the original URL; the existing Archive action stays unchanged.
- Keep normal history: X → first viewer → second viewer → X. Back/Forward never repeat the automatic redirect; freshly opening the same X URL redirects again.

**Test pages:**
- [X post](https://x.com/cocktailpeanut/status/1860756706357022812) — follow both arrows, then Back returns through Meowing, Tiekoetter, and the original X entry; reopen the X link to start again.
- [First viewer](https://nitter.tiekoetter.com/cocktailpeanut/status/1860756706357022812) — floating → opens Meowing; Back returns to this first viewer.
- [Second viewer](https://nitter.meowing.monster/cocktailpeanut/status/1860756706357022812) — floating → opens X; Back returns to this second viewer.

## Translate Preformatted Text — 2026-11-07_1.5.11

[Install TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js) · Reload after updating.

- Restore the verified 1.5.8 behavior with a higher version number; remove unverified iframe-opening controls from 1.5.9/1.5.10.
- Keep the code-block and Astro translation workarounds unchanged.

**Test pages:**
- [Claude Artifact](https://claude.ai/artifact/L8qsMc3SorytGW3LA81nYf) — no iframe-only 譯↗ action; native iframe translation remains unsupported.
- [Astro blog](https://aatishb.com/blog/) → [article](https://aatishb.com/blog/2026/introducing-myriad/) — full-page article navigation still supports browser translation.


Update each listed script independently.
