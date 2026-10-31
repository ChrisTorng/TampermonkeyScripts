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

## Translate Preformatted Text — 2026-11-01_1.5.8

[Install TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js) · Reload the page once after updating.

- Automatically detect Astro ClientRouter sites and use full-page navigation so browser auto-translation can run after opening pages.

**Test pages:**
- [Blog](https://aatishb.com/blog/) → [article](https://aatishb.com/blog/2026/introducing-myriad/) — open the article from the listing; expect auto-translation without a manual reload.
- [Metasora Blog](https://metasora.com/blog/) — open the first article in the same tab; expect auto-translation.
- [Bag of Tricks](https://events-3bg.pages.dev/) — open Reusable Components in the same tab; expect auto-translation.

Update each listed script independently.
