# Current updates

Updated: 2026-11-01

## RedirectUrls — 2026-11-01_1.6.0

[Install RedirectUrls.user.js](src/RedirectUrls.user.js) · Reload open X/viewer pages after updating and accept the new viewer-site permissions.

- Use Tiekoetter first; Next viewer opens Meowing, then Return to original ends the chain. Controls also appear in the Tampermonkey menu.
- Preserve the exact source URL; Back and reload stay on the original.

**Test pages:**
- [X post](https://x.com/cocktailpeanut/status/1860756706357022812) — opens Tiekoetter; Back then reload stays on X.
- [First viewer](https://nitter.tiekoetter.com/cocktailpeanut/status/1860756706357022812) — Next viewer opens Meowing; Return to original opens X.
- [Second viewer](https://nitter.meowing.monster/cocktailpeanut/status/1860756706357022812) — Return to original opens X without redirecting again.

## Translate Preformatted Text — 2026-11-01_1.5.8

[Install TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js) · Reload the page once after updating.

- Automatically detect Astro ClientRouter sites and use full-page navigation so browser auto-translation can run after opening pages.

**Test pages:**
- [Blog](https://aatishb.com/blog/) → [article](https://aatishb.com/blog/2026/introducing-myriad/) — open the article from the listing; expect auto-translation without a manual reload.
- [Metasora Blog](https://metasora.com/blog/) — open the first article in the same tab; expect auto-translation.
- [Bag of Tricks](https://events-3bg.pages.dev/) — open Reusable Components in the same tab; expect auto-translation.

Update each listed script independently.
