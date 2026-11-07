# Current updates

Updated: 2026-11-08

## Translate Preformatted Text — 2026-11-08_1.5.22 (Android Edge check)

[Install TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js) · Reload after updating.

- For any readable article with enough prose, remove a document-wide `<html translate="no">` blocker; preserve child opt-outs and interactive pages.
- Article root opt-out was verified in the original Perplexity HTML; the 1.5.21 browser fix was confirmed by the user. Version 1.5.22 reuses one opt-out helper; tests cover related regressions.

**Test:** [Perplexity Teammates article](https://www.perplexity.ai/en-GB/hub/blog/teammates-are-agents-for-complex-ongoing-work) — verify the confirmed fix still works after updating to 1.5.22; [Astro blog](https://aatishb.com/blog/) — navigation unchanged.

## BetaCat title-row collapse — 2026-11-07_1.8.2

[Install AutoOpenNewArticles.user.js](src/AutoOpenNewArticles.user.js) · Update Blog Bookmarks separately, then reload.

- Place each collapse arrow in its article's title row; only the title is inset, keeping images and summaries full width. The bookmark star remains accessible on collapsed articles.
- Remove the extra article toolbar row. The page-wide floating collapse button stays unchanged.

**Test pages:** [Latest](https://hackernews.betacat.io/) — arrows share title rows; [Daily archive](https://hackernews.betacat.io/daily/2026-11-06) — summaries retain full width.

## OpenSSH floating menu and five-script updater — 2026-11-07

[Open all five update tabs](tests/SharedFloatingMenuUpdates/index.html) (confirm each Tampermonkey Update).

- [Translate Preformatted Text — 1.5.21](src/TranslatePreformattedText.user.js): OpenSSH formatting fixes and standalone iframe viewing.
- Shared menu — update together: [All Go Internet Archive — 1.3.10](src/AllGoInternetArchive.user.js), [Internet Archive — 1.5.10](src/InternetArchive.user.js), [Force Mobile View — 2.1.9](src/ForceMobileView.user.js), [Force Dark Mode — 2.0.10](src/ForceDarkMode.user.js), and Translate Preformatted Text above. Dock the menu during OpenSSH scrolling; leave space below the updater links. Reload after updating.

**Tests:** [OpenSSH release notes](https://www.openssh.org/releasenotes.html) — ≡ remains reachable during scrolling; [Claude Artifact](https://claude.ai/artifact/L8qsMc3SorytGW3LA81nYf) — no unverified iframe opener.

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

Update each listed script independently.
