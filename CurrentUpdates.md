# Current updates

Updated: 2026-11-13

## Math translation hybrid — 2026-11-14 (Draft PR #148)

- [MathTranslationGuard.user.js v2026-11-14_1.2.3](src/MathTranslationGuard.user.js) — on [Alex Wang](https://alexwang.ai/posts/reasoning-as-pathfinding/), leave nonmath text alone, protect both math-only blocks and standalone MathJax display formulas, and reconstruct inline formulas from an untranslated original when translated text segments remain identifiable. Otherwise retain a complete readable original.
- [InlineTranslationOrderGuard.user.js v2026-11-14_1.0.2](src/InlineTranslationOrderGuard.user.js) — independent code/order experiment for other sites; deliberately excluded from Alex Wang to avoid conflicting DOM repositioning.

**Native Edge evidence:** [Math Visibility Lab D](https://tm-math-translation-lab.christorng.workers.dev/?mode=paragraph), [G](https://tm-math-translation-lab.christorng.workers.dev/?mode=engines). Real Edge G: MathJax Chinese reconstruction and math order succeeded; KaTeX sentence alignment differed; MathML text remained English. The production-site hybrid remains unconfirmed in native Android Edge. Headless Chromium verified the live article and complex math-only/SVG/div/dynamic cases.

## Fullscreen button docking — 2026-11-13

- [Install FullscreenGameView.user.js — 2026-11-13_1.2.3](src/FullscreenGameView.user.js) — match ≡ styling and top docking; default just left of ≡, without automatic avoidance. Dragging may overlap; scroll stays fixed. Reload after updating.

**Tests:** [ARC Prize game](https://arcprize.org/tasks/ls20) — default placement, drag overlap and scroll docking; [Anthropic embedded YouTube](https://www.anthropic.com/claude-fable-and-mythos-5-2) — per-player buttons remain available.

## Hacker News comment-only automatic enlargement — 2026-11-12

- [Install ForceMobileView.user.js — 2026-11-12_2.1.10](src/ForceMobileView.user.js) — automatically enlarge only HN story comments, not lists or profiles. Other sites and manual ↔ are unchanged. Reload after updating.

**Tests:** [Historical list](https://news.ycombinator.com/front?day=2024-11-08) — no auto-enlargement after translation; [Homepage](https://news.ycombinator.com/) — stays compact; [Comments](https://news.ycombinator.com/item?id=46255285) — still auto-enlarges.

## Scroll indicator visibility — 2026-11-12_1.4.0

- [Install ResponsiveScrollIndicator.user.js](src/ResponsiveScrollIndicator.user.js) — show extra markers only when less than half of content is visible; hide mostly off-screen slide-out menus. Reload after updating.

**Tests:** [CBS News mobile drawer](https://www.cbsnews.com/chicago/news/field-museum-karl-patterson-schmidt-deadly-snakebite-diary/) — closed menu has no stray left marker; open/close it to verify. [IndieWeb POSSE](https://indieweb.org/POSSE) — long page retains its right-edge marker.

## Embedded YouTube landscape fullscreen — 2026-11-10

- [Install YouTubeTools.user.js — 2026-11-10_1.8.3](src/YouTubeTools.user.js) — embedded YouTube reports actual video dimensions and handles native fullscreen orientation.
- [Install FullscreenGameView.user.js — 2026-11-10_1.2.2](src/FullscreenGameView.user.js) — give every lazy YouTube iframe its own ⛶ control, including after GIF previews become players; retain Android landscape rotation. Update both scripts, then reload.

**Test:** [Anthropic Fable/Mythos](https://www.anthropic.com/claude-fable-and-mythos-5-2) — play the later GIF/video previews, then verify each inserted YouTube player gets its own ⛶; both fullscreen methods should rotate landscape videos. Android Edge confirmation still required.

## Translate Preformatted Text — 2026-11-07_1.5.20 (test)

[Install TranslatePreformattedText.user.js](src/TranslatePreformattedText.user.js) · Reload open pages after updating.

- Show an independent, borderless translucent **譯↗** at the upper-right of readable iframes. Drag without opening; no saved position, sticky scrolling, or ≡ menu entry.
- Copy iframe HTML into [Iframe Viewer](IframeViewer.html) at christorng.idv.tw/TampermonkeyScripts/. The full source title and URL remain in the query string.
- A reader refresh restores content from per-tab sessionStorage; if unavailable, replace the current tab with its source URL. Delete GM handoffs after import.

**Test:** [Claude Artifact](https://claude.ai/artifact/L8qsMc3SorytGW3LA81nYf), [Iframe Viewer](https://christorng.idv.tw/TampermonkeyScripts/IframeViewer.html), [Astro regression](https://aatishb.com/blog/).

**Status:** Integrated changes remain in a draft PR for Android Edge verification; no Clipboard Viewer or Vercel URL is used.

## BetaCat title-row collapse — 2026-11-07_1.8.2

[Install AutoOpenNewArticles.user.js](src/AutoOpenNewArticles.user.js) · Update Blog Bookmarks separately, then reload.

- Place each collapse arrow in its article's title row; only the title is inset, keeping images and summaries full width. The bookmark star remains accessible on collapsed articles.
- Remove the extra article toolbar row. The page-wide floating collapse button stays unchanged.

**Test pages:** [Latest](https://hackernews.betacat.io/) — arrows share title rows; [Daily archive](https://hackernews.betacat.io/daily/2026-11-06) — summaries retain full width.

## OpenSSH floating menu and five-script updater — 2026-11-07

[Open all five update tabs](tests/SharedFloatingMenuUpdates/index.html) (confirm each Tampermonkey Update).

- [Translate Preformatted Text — 1.5.20](src/TranslatePreformattedText.user.js): OpenSSH formatting fixes and standalone iframe viewing.
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
