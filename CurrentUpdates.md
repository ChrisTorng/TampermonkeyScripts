# Current updates

Updated: 2026-11-17

## English article language mismatch — 2026-11-18

- [Install TranslatePreformattedText.user.js — 2026-11-18_1.5.28](src/TranslatePreformattedText.user.js) — detect substantial English articles even when the enclosing site is marked German or another language. Correct only the document language hint; do not rewrite article content or reset it during translation. Reload after updating.
- **Tests:** [Crissy Field English report](https://www.crissyfield.de/research/lovable-en/) — check automatic translation; [Perplexity Decider](https://www.perplexity.ai/hub/blog/perplexity-decider) — keep previous correction; [German-language report](https://www.crissyfield.de/research/lovable/) — do not change genuine German text. Browser auto-translation still requires Android Edge verification.

## Readable article translation opt-out — 2026-11-15

[Translate Preformatted Text 1.5.26](src/TranslatePreformattedText.user.js): allow native browser translation of substantial articles blocked by document-level `translate="no"`, keeping child exclusions and interactive apps unchanged. Test: [Perplexity article](https://www.perplexity.ai/en-GB/hub/blog/teammates-are-agents-for-complex-ongoing-work).

## Shared menu recovery and position reset — 2026-11-15

Restore detached floating controls after page re-rendering; reset position without reloading, and keep the settings panel within the visible viewport. Update all five shared-menu scripts together.

## Fullscreen ad-iframe layout guard — 2026-11-15

- [Install FullscreenGameView.user.js — 2026-11-15_1.2.4](src/FullscreenGameView.user.js) — ignore ordinary advertisement/widget iframes; preserve existing absolute, sticky, or fixed positioning on actual video containers. Reload after updating.
- **Tests:** [Nieman Lab article](https://www.niemanlab.org/2026/11/ai-is-becoming-an-information-gateway-audiences-still-dont-want-it-making-their-news/) — no blank top caused by a false fullscreen target or accidental ad iframe selection; [ARC Prize game](https://arcprize.org/tasks/ls20) — existing fullscreen control remains; [Anthropic embedded videos](https://www.anthropic.com/claude-fable-and-mythos-5-2) — YouTube controls still appear.

## Preformatted translation appearance — 2026-11-15

- [Install TranslatePreformattedText.user.js — 2026-11-15_1.5.24](src/TranslatePreformattedText.user.js) — preserve nested quote styling, preformatted spacing, and GitHub syntax highlighting. Keep rendered Mermaid diagrams in place. Reload after installing.
- Toggle **譯** with browser translation off, then enable it to compare [Substack quote rules](https://simonw.substack.com/p/locating-the-source-of-a-mysterious), [GitHub syntax colors](https://github.com/okf-memory/okf-agent-memory/blob/main/README.md?plain=1), [OpenSSH links and indents](https://www.openssh.org/releasenotes.html), and [plain-text spacing](https://commandlinesystems.com/magic.txt).

## BetaCat browser refresh times — 2026-11-17_1.9.1

- [Install AutoOpenNewArticles.user.js — 2026-11-17_1.9.1](src/AutoOpenNewArticles.user.js) — Latest shows **previous and current browser page-load times**, not site update times. Today: HH:mm; earlier: M/D HH:mm; first use: —. Reload after updating.

**Tests:** [Latest](https://hackernews.betacat.io/) — refresh twice and compare current time with phone clock; [Dated archive](https://hackernews.betacat.io/daily/2026-11-14) — archive navigation stays unchanged.

## Plain-text translation and mobile reading — 2026-11-14

- [Install ForceMobileView.user.js — 2026-11-14_2.1.12](src/ForceMobileView.user.js) — give raw .txt pages a mobile viewport before layout; recognize other single-PRE prose pages when the ≡ handle is physically tiny and reload safely once; keep shared-menu/fullscreen sizes consistent. ↔ OFF restores the original viewport on reload.
- [Install TranslatePreformattedText.user.js — 2026-11-14_1.5.22](src/TranslatePreformattedText.user.js) — auto-enable prose-heavy Markdown source translation, preserve GitHub's independent line numbers and per-line height, keep fenced code unchanged, and restore originals when turned off. Native Edge translation still requires browser support.

**Tests:** [Emacs in the Age of Magic (.txt)](https://commandlinesystems.com/magic.txt) — readable text and controls, automatic translation eligibility, manual original restoration; [GitHub Markdown source](https://github.com/okf-memory/okf-agent-memory/blob/main/README.md?plain=1) — prose auto-enables without merging rows; line numbers remain aligned, fenced code stays unchanged; [HN historical list](https://news.ycombinator.com/front?day=2024-11-08) — no automatic enlargement. Reload after both updates.

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
