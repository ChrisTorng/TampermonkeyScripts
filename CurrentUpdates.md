# Current updates

## Translate Preformatted Text — 2026-11-07_1.5.20

[Install TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js) · Reload pages after updating.

- Show an independent, borderless, translucent **譯↗** at the upper-right of readable iframes. Drag without opening; no saved position, no fixed scrolling, no ≡ menu entry.
- Capture iframe HTML for [Iframe Viewer](IframeViewer.html) under christorng.idv.tw/TampermonkeyScripts/. A complete linked source title and URL stay in its query string.
- Refresh restores the article from per-tab sessionStorage. If the snapshot is lost, replace the current tab with its source page. GM handoffs are deleted after import and bounded to a short lifetime.

**Test pages:**
- [Claude Artifact](https://claude.ai/artifact/L8qsMc3SorytGW3LA81nYf) — the user-confirmed iframe content can be captured; test the new generic button and linked-title viewer.
- [Iframe Viewer](https://christorng.idv.tw/TampermonkeyScripts/IframeViewer.html) — static shell; article content appears only when invoked from the userscript.
- [Astro blog](https://aatishb.com/blog/) — existing navigation translation regression check.

**Status:** Unified script remains a draft PR pending Android Edge verification. No Clipboard Viewer or Vercel URL is used.


## OpenSSH floating menu and five-script updater — 2026-11-07

[Open all five update tabs](tests/SharedFloatingMenuUpdates/index.html) (confirm each Tampermonkey Update).

- [Translate Preformatted Text — 1.5.18](src/TranslatePreformattedText.user.js): translate OpenSSH release notes while retaining safe, no-iframe behavior.
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
