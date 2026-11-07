# Current updates

Updated: 2026-11-07

## OpenSSH vertical menu and bulk updates — 2026-11-07

[Open all five updates](tests/SharedFloatingMenuUpdates/index.html?ref=fix%2Fopenssh-translate-menu-overflow-20261107) — confirm each Tampermonkey Update; install Force Mobile View first if batch opening is not yet enabled.

- [Translate Preformatted Text — 1.5.17](src/TranslatePreformattedText.user.js): OpenSSH release translation, iframe fallback and no observer loop.
- Shared menu (install together): [All Go Internet Archive — 1.3.10](src/AllGoInternetArchive.user.js), [Internet Archive — 1.5.10](src/InternetArchive.user.js), [Force Mobile View — 2.1.9](src/ForceMobileView.user.js), [Force Dark Mode — 2.0.10](src/ForceDarkMode.user.js), and Translate Preformatted Text above. OpenSSH now follows the visual document using bounded absolute positioning; other sites retain fixed positioning. Reload after updating.

**Tests:** [OpenSSH release notes](https://www.openssh.org/releasenotes.html) (scroll before/after 譯), [batch updater](tests/SharedFloatingMenuUpdates/index.html?ref=fix%2Fopenssh-translate-menu-overflow-20261107) (five tabs).

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

## Translate Preformatted Text — 2026-11-01_1.5.8

[Install TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js) · Reload the page once after updating.

- Automatically detect Astro ClientRouter sites and use full-page navigation so browser auto-translation can run after opening pages.

**Test pages:**
- [Blog](https://aatishb.com/blog/) → [article](https://aatishb.com/blog/2026/introducing-myriad/) — open the article from the listing; expect auto-translation without a manual reload.
- [Metasora Blog](https://metasora.com/blog/) — open the first article in the same tab; expect auto-translation.
- [Bag of Tricks](https://events-3bg.pages.dev/) — open Reusable Components in the same tab; expect auto-translation.

Update each listed script independently.
