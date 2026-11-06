# Current updates

Updated: 2026-11-01

## RedirectUrls — 2026-11-01_1.6.2

[Install RedirectUrls.user.js](src/RedirectUrls.user.js) · Reload open X/viewer pages after updating.

- Replace the large toolbar with a separate compact floating → below ≡; no page/header layout changes. Click for Meowing, then the original URL; the existing Archive action stays unchanged.
- Keep normal history: X → first viewer → second viewer → X. Back/Forward never repeat the automatic redirect; freshly opening the same X URL redirects again.

**Test pages:**
- [X post](https://x.com/cocktailpeanut/status/1860756706357022812) — follow both arrows, then Back returns through Meowing, Tiekoetter, and the original X entry; reopen the X link to start again.
- [First viewer](https://nitter.tiekoetter.com/cocktailpeanut/status/1860756706357022812) — floating → opens Meowing; Back returns to this first viewer.
- [Second viewer](https://nitter.meowing.monster/cocktailpeanut/status/1860756706357022812) — floating → opens X; Back returns to this second viewer.

## Translate Preformatted Text — 2026-11-06_1.5.9

[Install TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js) · Reload the page after updating.

- When a large embedded document cannot be translated, choose **譯↗** from ≡ to open its frame separately for browser translation. Multiple frames show a selector; the original page is unchanged.
- Existing preformatted-code controls and Astro navigation translation remain unchanged.

**Test pages:**
- [Claude Artifact](https://claude.ai/artifact/L8qsMc3SorytGW3LA81nYf) — choose ≡ → 譯↗; the signed embedded page opens in a new tab if its URL is independently accessible. Apply Edge Translate there.
- [Astro blog](https://aatishb.com/blog/) — article navigation should still retrigger browser translation.
