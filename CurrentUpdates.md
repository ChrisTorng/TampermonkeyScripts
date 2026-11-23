## BetaCats 專用功能移交至 blog-bookmarks — 2026-11-23

BetaCats 日期、已讀／收合、熱度、手機排版、背景外連目前由 [BlogBookmarks.user.js](https://github.com/ChrisTorng/blog-bookmarks/blob/main/tampermonkey/BlogBookmarks.user.js) 維護。以下保留舊版歷史變更紀錄，舊版 BetaCats Scripts 不再是維護位置。

## Google Blog embedded-video fullscreen — 2026-11-23
- [Install Fullscreen Game View 2026-11-23_1.3.3](src/FullscreenGameView.user.js) — place HTML5 video and known player-iframe ⛶ controls inside the actual media top-right edge, keeping the complete button visible when the outer player clips overflow. Existing landscape auto-rotation, YouTube Tools and Nitter behavior remain separate. Update this one script and reload the article.
- **Test:** [Google Genie 4 article](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/genie-4-now-available-project-genie/) — each playable video should show ⛶ and landscape fullscreen should rotate; actual Android Edge testing is still required. [Anthropic embeds](https://www.anthropic.com/claude-fable-and-mythos-5-2) — existing YouTube buttons remain available.

# Current updates

Updated: 2026-11-21

## One-install shared floating menu — 2026-11-23

- [Install Shared Floating Menu — All in One **2026-11-23_1.0.1**](src/SharedMenuAllInOne.user.js). Combines the existing archive, mobile, dark and formatted translation scripts without changing the five standalone versions. **Disable** those five before enabling this bundle; no uninstall is needed.
- Every top-level page load checks a small [main metadata file](src/SharedMenuAllInOne.meta.js), outlining ≡ and showing ↥ only if a newer merged version is available. Tapping ↥ opens one installer tab. The first page load after a new installed version shows a short version status.
- **Tests:** [Example article](https://example.org/) — one shared ≡, update menu quiet when current; [BBC](https://www.bbc.com/) — archive source rules preserved; [Xena WordPress](https://xenaproject.wordpress.com/2026/11/12/and-the-proof-is-checked-in-lean/) — mobile action remains and no reload loop. Android Edge still requires native validation.

## Easier Android Edge userscript updates — 2026-11-21

- Already-installed `main` scripts update via Tampermonkey's **Userscript Update → Automatic installation**; choose an appropriate check interval. Translate Preformatted Text **2026-11-21_1.5.37** ([install](src/TranslatePreformattedText.user.js)) now explicitly tracks `main` through `@updateURL` and `@downloadURL`; this metadata fix requires one update, then normal automatic updates can take over.
- The [five-script test-update launcher](tests/SharedFloatingMenuUpdates/index.html) now offers a Microsoft Edge deep link for opening the page outside an in-app viewer. This depends on Android/app link handling; standard external-browser opening is the fallback. PR builds still need manual confirmation.
- PR CI now rejects changed `.user.js` files when their `@version` was not increased. Use an installed version check and a direct PR install link for testing; avoid unnecessary Reinstall.

## Floating menu only: normal touch size on tiny webpages — 2026-11-21

- The shared `≡` and expanded controls maintain their normal 38 × 32 apparent size as Edge shrinks or pinches a page. Position anchoring and manual `↔` remain; article/viewport styles and auto-enlargement are **untouched**. Settings panel remains visible. Update all five together: [All Go Internet Archive 1.3.15](src/AllGoInternetArchive.user.js), [Internet Archive 1.5.15](src/InternetArchive.user.js), [Force Mobile View 2.1.16](src/ForceMobileView.user.js), [Force Dark Mode 2.0.15](src/ForceDarkMode.user.js), [Translate Preformatted Text 1.5.37](src/TranslatePreformattedText.user.js).
- **Tests:** [Xena WordPress article](https://xenaproject.wordpress.com/2026/11/12/and-the-proof-is-checked-in-lean/) — tiny original page, readable `≡`, no page reflow/reload; [OpenSSH release notes](https://www.openssh.org/releasenotes.html) — 1:1 menu size on initial browser auto-fit. Android Edge visual confirmation still required.

## Rollback: Android Edge oversized text and reload loop — 2026-11-21

- [Force Mobile View 2026-11-21_2.1.15](src/ForceMobileView.user.js) — remove the failed Twenty Ten WordPress auto-reflow; return to manual ↔ only. Avoid automatic viewport injection and page reload loops.
- Restore the previous shared menu zoom behavior, retaining other feature updates. Update all five scripts: [All Go Internet Archive 1.3.14](src/AllGoInternetArchive.user.js), [Internet Archive 1.5.14](src/InternetArchive.user.js), [Force Mobile View 2.1.15](src/ForceMobileView.user.js), [Force Dark Mode 2.0.14](src/ForceDarkMode.user.js), [Translate Preformatted Text 1.5.35](src/TranslatePreformattedText.user.js).
- **Tests:** [Xena WordPress article](https://xenaproject.wordpress.com/2026/11/12/and-the-proof-is-checked-in-lean/) — must not reload repeatedly or get giant fonts; [OpenSSH release notes](https://www.openssh.org/releasenotes.html) — shared menu retains prior behavior. This rollback does not yet solve tiny controls on old desktop layouts.

## Large gallery performance and one-click diagnostics — 2026-11-21

- [Install Translate Preformatted Text — 2026-11-21_1.5.34](src/TranslatePreformattedText.user.js) — batch global article scans once per DOM mutation delivery; preserve per-code controls and auto-translation.
- [Install Translation Diagnostics — 2026-11-21_1.2.1](src/TranslationDiagnostics.user.js) — larger panel, hide pairing controls once paired, pinned bottom actions/status, explicit one-click refresh then single automatic structure report after page stabilizes (40-second cap).
- [Install Responsive Scroll Position Indicator — 2026-11-21_1.4.3](src/ResponsiveScrollIndicator.user.js) — keep very long-page gray scrollbar thumb at least 24 CSS pixels tall.
- **Tests:** [VisualBasic.World gallery](https://visualbasic.world/) — verify that images and cards load promptly and the gray edge marker is visible; [Perplexity Decider](https://www.perplexity.ai/hub/blog/perplexity-decider) — English article translation unaffected; [Example.org](https://example.org/) — diagnostics panel close, pairing, and manual/auto controls.


## Large galleries: avoid repeated full-page scroll scans — 2026-11-21

- [Install Responsive Scroll Position Indicator — 2026-11-21_1.4.2](src/ResponsiveScrollIndicator.user.js) — check only changed DOM subtrees during normal updates; throttle full scans on very large dynamic pages. Reload after updating.
- **Tests:** [VisualBasic.World](https://visualbasic.world/) — project gallery loads without extreme delays; [Mastodon nested scroll area](https://mastodon.social/@firefoxwebdevs/115740500373677782) — only real, long, visible scrollports keep gray markers.

## Prose quotations with inline code — 2026-11-20

- [Install TranslatePreformattedText.user.js — 2026-11-20_1.5.32](src/TranslatePreformattedText.user.js) — leave prose-dominated quotations in native browser translation even when they contain many small inline code examples. Code-dominated and nested-code quotations keep manual 譯 controls; preformatted blocks stay manually controlled.
- **Tests:** [Jack.cab siterate article](https://jack.cab/blog/siterate) — the "AI disclosure" quotation should translate automatically without tapping 譯; [Simon Willison quoted code](https://simonwillison.net/2026/Sep/2/claudes-new-system-prompt/) — manual code-block control remains. Live DOM was not available to the assistant; verify in Android Edge.

## Universal web diagnostics — 2026-11-18

- [Install Translation Diagnostics 2026-11-18_1.1.1](src/TranslationDiagnostics.user.js) — the report panel starts hidden, opens above its compact button, and has an always-accessible top-row close button. It is capped to 60% of the viewport height. Update and reload.
- The **Next page refresh** action only arms Console recording: it does **not** reload or upload anything. Refresh manually, then submit when ready.
- **Tests:** [TechSpot](https://www.techspot.com/news/114558-nvidia-deliberately-kept-gpu-prices-high-through-circular.html) — no obstructing panel on entry, open/close works; [Perplexity Decider](https://www.perplexity.ai/hub/blog/perplexity-decider) — report stays accessible after navigation; [Example](https://example.org/) — no auto-upload.
- Pairing uses a one-time 10-character code; after approval, user-initiated reports go to private Cloudflare KV for seven days.

## Readable articles with Google notranslate meta — 2026-11-18

- [Install TranslatePreformattedText.user.js — 2026-11-18_1.5.30](src/TranslatePreformattedText.user.js) — allow native translation of substantial articles blocked by `<meta name="google" content="notranslate">`, while preserving unrelated meta directives, child opt-outs, and short interactive pages. Reload after updating.
- **Tests:** [TechSpot Nvidia article](https://www.techspot.com/news/114558-nvidia-deliberately-kept-gpu-prices-high-through-circular.html) — verified Android Edge reports show an `en-US` article with a global Google `notranslate` marker; check whether automatic translation starts on a new page load. [Perplexity Decider](https://www.perplexity.ai/hub/blog/perplexity-decider) — existing language correction stays intact. Android Edge behavior still needs actual confirmation.

## BetaCat popularity indicators — 2026-11-18_1.9.5

- [Install AutoOpenNewArticles.user.js — 2026-11-18_1.9.5](src/AutoOpenNewArticles.user.js) — highlight **numeric totals only**; the fastest time-adjusted score and comment on the current Latest page independently receive the brightest yellow, with continuous linear fading for the rest. Archives remain neutral. Reload after updating.
- **Tests:** [Latest](https://hackernews.betacat.io/) — compare the yellow highlights and metric tooltips; [Archive](https://hackernews.betacat.io/daily/2026-11-16) — no inferred live heat.


## Nitter fullscreen controls restored — 2026-11-18

- [Install Fullscreen Game View 2026-11-18_1.3.2](src/FullscreenGameView.user.js): render one ⛶ for Nitter poster images and video playback, anchored to the unclipped tweet container instead of the overflow-hidden gallery. Keep CSS-stable scrolling, transparent glyph, and Back-to-exit.
- [Live Nitter video](https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214) — verify the same ⛶ appears before and after Play.

## Fullscreen controls visible on Android — 2026-11-18

- [Install FullscreenGameView.user.js — 2026-11-18_1.2.7](src/FullscreenGameView.user.js) — give each Nitter video a visible top-layer control, even with other videos off screen; detect late ARC game roots. Reload the page after updating.
- **Live HTML test:** [Rendered fullscreen canvas](https://tm-fullscreen-test.christorng.workers.dev/) (not a GitHub source viewer). **Real pages:** [Nitter video](https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214) and [ARC game](https://arcprize.org/tasks/ls20).

## Media-anchored subtle fullscreen button — 2026-11-18

- [Install Fullscreen Game View 2026-11-18_1.3.1](src/FullscreenGameView.user.js): transparent background, muted ⛶ corner glyph, no shadow. Buttons are absolutely positioned in their own media/iframe/game host, not viewport-following; normal scrolling (including nested scrolling) uses CSS only, without JS movement, hiding or edge clamping. Ordinary article photos no longer get buttons; Nitter photo attachments still do. On YouTube watch pages, YouTube Tools remains the only fullscreen control.
- **Check:** [Nitter media](https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214), [rendered canvas](https://tm-fullscreen-test.christorng.workers.dev/), [embedded YouTube](https://www.anthropic.com/claude-fable-and-mythos-5-2). Scroll slowly/rapidly and ensure the icon remains fixed relative to the block.

## Back-only fullscreen fallback, Nitter landscape correction, and YouTube isolation — 2026-11-18

- [Install Fullscreen Game View 2026-11-18_1.3.0](src/FullscreenGameView.user.js): **No × in simulated fullscreen**; use Android Back (same-URL History entry). Cache the Nitter video's pre-dialog aspect ratio to keep landscape rotation despite reparenting and CSS-induced portrait dimensions. On `youtube.com`/`youtube-nocookie.com`, Fullscreen Game View does not mount at all; YouTube Tools remains the single owner of its integrated fullscreen/rotation/speed controls.
- **Test:** [Nitter video](https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214) — landscape fallback fills the sideways view and Back returns to the article; [YouTube mobile watch](https://m.youtube.com/watch?v=zeWBx3AePow) — only the original YouTube Tools fullscreen in the playback-speed toolbar; [Canvas HTML](https://tm-fullscreen-test.christorng.workers.dev/) — use Back to exit fallback. Device-level native fullscreen browser-bar hiding still requires Android Edge confirmation.

## Images, landscape, and Back-to-exit — 2026-11-18

- [Install Fullscreen Game View v2026-11-18_1.2.9](src/FullscreenGameView.user.js): add large still-image controls (including Nitter photo attachments); rotate using intrinsic video/image/canvas dimensions; if media metadata is unknown, use block shape except for YouTube, which waits for true dimensions. In simulated fullscreen, pressing Android Back now consumes one same-URL history entry and restores media; × is lighter and sits in the actual **upper-right of the rotated viewing orientation**. The old native video fullscreen API remains the first attempt, with its actual rejection type recorded for diagnosis.
- **Tests:** https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214 (video), https://tm-fullscreen-test.christorng.workers.dev/ (rendered canvas HTML), https://arcprize.org/tasks/ls20 (game). The Android Edge native-fullscreen result still requires device confirmation; HTML/CSS fallback cannot remove browser chrome.

## Per-block fullscreen entry and explicit fallback exit — 2026-11-18

- [Install Fullscreen Game View 2026-11-18_1.2.8](src/FullscreenGameView.user.js): each game, video, canvas, or known embedded player has its own ⛶ icon just **outside, above the top-right of that block**. The page menu remains separate. Native fullscreen is attempted first even when the permission hint says false; only an actual rejected/unavailable call opens the simulated fallback. Fallback always exposes a top-right × to restore the original page without Android Back.
- **Direct live test page:** https://tm-fullscreen-test.christorng.workers.dev/ (rendered HTML, not a GitHub code listing). Also retest Nitter, ARC Prize, and embedded YouTube. A browser must grant the native Fullscreen API to actually hide its own navigation bars; a modal dialog alone cannot do that. Test on the real Android Edge device before merging.

## Nitter fullscreen and auto-orientation — 2026-11-18

- [Install FullscreenGameView.user.js — 2026-11-18_1.2.6](src/FullscreenGameView.user.js) — use Nitter's real video fullscreen; if blocked, show only its video in a top-layer dialog. Rotate landscape videos automatically and restore the page on exit; portrait stays upright. Disable/uninstall the older **Full Screen** branch copy. Reload after updating.
- **Tests:** [Nitter video](https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214) — playable fullscreen, auto-landscape, Escape/Back restoration; [ARC Prize game](https://arcprize.org/tasks/ls20) — game fullscreen unaffected; [Anthropic videos](https://www.anthropic.com/claude-fable-and-mythos-5-2) — YouTube orientation unchanged; [Nieman Lab](https://www.niemanlab.org/2026/11/ai-is-becoming-an-information-gateway-audiences-still-dont-want-it-making-their-news/) — no ad-iframe layout shift.

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
