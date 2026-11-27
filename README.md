# [Tampermonkey Scripts](https://github.com/ChrisTorng/TampermonkeyScripts)

Some useful [Tampermonkey](https://www.tampermonkey.net/) scripts for browser tasks.

**[Current updates: install the changed scripts and verify them](CurrentUpdates.md)**

## Single-install option — recommended for personal use

### [Shared Floating Menu — All in One](https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/SharedMenuAllInOne.user.js)

**Android Edge／Tampermonkey 5.5.1 安裝疑難：** 若直接點選上面的 `.user.js` 連結後跳至 `tampermonkey.net/script_installation.php#url=...`，接著出現 **Invalid Userscript!**，先不要改腳本內容或重複點同一連結。這可能是 Tampermonkey 中介安裝頁的交接問題，不表示原始腳本無效。請進入 Tampermonkey **Dashboard → Utilities → Import from URL**，貼入下列**原始碼 URL**（不可貼中介頁網址），再確認安裝：

```text
https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/SharedMenuAllInOne.user.js
```

如果 URL 匯入也失敗，可從該 URL 下載完整 `.user.js` 檔，使用 Utilities 的 **Import from file**。不要使用 GitHub HTML 程式碼檢視頁或 `script_installation.php` 作為匯入來源。這是瀏覽器擴充功能的安裝操作，網頁 JavaScript 無法代替使用者核准。Tampermonkey 官方已記錄中介安裝頁異常（[Issue #2863](https://github.com/Tampermonkey/tampermonkey/issues/2863)）與 Utilities 匯入 URL 的替代方式（[Issue #2675](https://github.com/Tampermonkey/tampermonkey/issues/2675)）。


Install **one** script to get all five floating-menu functions: archive shortcut, archive redirect, mobile readability, dark mode, and formatted-text translation. The bundled script is built from the same five standalone sources, preserving each script's matching/exclusion rules. **Disable** the five separate scripts in Tampermonkey before enabling the bundle to avoid duplicate controls and side effects; do not uninstall them, so existing script-specific settings remain available if you switch back. Shared per-site menu settings are still stored in site localStorage.

On each top-level page load, the bundle checks the small [official main version metadata](https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/SharedMenuAllInOne.meta.js), never an unmerged PR. If a newer version exists, the ≡ handle is outlined and exposes ↥ inside its expanded menu. Tap ↥ to open the direct one-script update link in Edge. After upgrading, reload the content page; a short status label displays the installed version on first load of a new version. Tampermonkey's own automatic updates remain supported. An installer cannot silently click Tampermonkey's extension-owned Update button or close extension tabs.

## Shared floating-menu scripts — update together when the menu changes

**Already installed?** Prefer Tampermonkey Dashboard → Settings → Userscript Update → a suitable Check Interval + **Automatic installation**. All five scripts already have `@version`, `@updateURL`, and `@downloadURL` pointing to `main`; published updates should require no manual install tabs. Reload the affected page after an update.

[Manual test-build updater (open in Edge on Android)](tests/SharedFloatingMenuUpdates/index.html) — use for unmerged PR builds; on supported mobile devices the page offers an Edge deep link. Each Tampermonkey Update still needs individual confirmation, and in-app browsers may block deep links.

**When the shared menu implementation changes, update all five scripts below together** to keep the menu consistent. The menu maintains a normal-sized touch target even on shrink-to-fit pages; it never scales the article. Independent feature updates (such as Fullscreen Game View or an individual block control) do not require a five-script menu update.

### [All Go Internet Archive User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js)

Add a quick Internet Archive action in the shared floating menu and mark Archive Today links.

### [Internet Archive User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js)

Send most paywall articles to [Internet Archive](https://web.archive.org) for archiving, hide fixed titles, and offer an [Archive Today](https://archive.is) fallback.

- **From** [https://www.rawstory.com/laura-loomer-vs-elon-musk/](https://www.rawstory.com/laura-loomer-vs-elon-musk/)
- **Redirected to** [https://web.archive.org/web/20250106005830/https://www.rawstory.com/laura-loomer-vs-elon-musk/](https://web.archive.org/web/20250106005830/https://www.rawstory.com/laura-loomer-vs-elon-musk/)

### [Force Mobile View User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceMobileView.user.js)

Improve tiny mobile text and prose-only pages, auto-enlarge Hacker News discussions (not listings), and retain manual / URL-based ↔ controls.

### [Force Dark Mode User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceDarkMode.user.js)

Force dark colors with a shared-menu ☽ toggle and URL-based auto-enable.

### [Translate Preformatted Text User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslatePreformattedText.user.js)

Translate formatted prose without losing layout, unblock readable articles with root or meta translation opt-outs, and correct misleading English language labels. Prose quotations with inline code translate normally; code-heavy quotations keep manual controls. The independent 譯↗ reader is also supported.

---

## Independent scripts — update individually

Update each script below separately as needed.

### [Translation Diagnostics User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationDiagnostics.user.js)

Universal opt-in web diagnostics with sanitized DOM, CSS, rendered geometry, viewport reconstruction or an attached screenshot, translation diagnostics and console/error logs; private paired Cloudflare reporting with one-day retention.



Update each script below separately as needed.

### [Hacker News Comments User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsComments.user.js)

Add an article button for Hacker News comments, including pages reached through redirects.

### [RedirectUrls User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js)

Redirect supported pages to readable destinations, with a compact X viewer fallback arrow and normal browsing history.

Supported sites:
- [X](https://x.com/) / [Twitter](https://twitter.com/) posts → [Tiekoetter](https://nitter.tiekoetter.com/), then [Meowing](https://nitter.meowing.monster/) via a separate floating → below the tools menu, then the exact original URL. The Tampermonkey menu also offers Return to original. Every visit remains in history; Back/Forward do not retrigger redirects, while fresh X links do.
- [Reddit](https://www.reddit.com/) stays on www.reddit.com for account-free browsing; old.reddit.com links and old-site login (`reason=lor2`) redirects recover the equivalent www URL without third-party frontends.
- [GitHub](https://github.com/) repository `readme-ov-file` tab → repository main page on GitHub
- [arXiv](https://arxiv.org/) abs/pdf pages → arXiv HTML view

### [Reddit Hide App Popup User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedditHideAppPopup.user.js)

Hide Reddit mobile-app blocking prompts and restore scrolling without redirecting.

### [Archive Today User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js)

Redirect selected paywall pages to [Archive Today](https://archive.is), hide prompts, and jump into the content.

- **From** [https://www.bloomberg.com/opinion/articles/2024-12-12/exxon-s-ai-power-play-aims-to-beat-nuclear](https://www.bloomberg.com/opinion/articles/2024-12-12/exxon-s-ai-power-play-aims-to-beat-nuclear)
- **Redirected to** [https://archive.is/submit/?url=https%3A%2F%2Fwww.bloomberg.com%2Fopinion%2Farticles%2F2024-12-12%2Fexxon-s-ai-power-play-aims-to-beat-nuclear](https://archive.is/submit/?url=https%3A%2F%2Fwww.bloomberg.com%2Fopinion%2Farticles%2F2024-12-12%2Fexxon-s-ai-power-play-aims-to-beat-nuclear)

### [The Neuron Daily User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TheNeuronDaily.user.js)

Hide non-essential elements on [The Neuron Daily](https://www.theneurondaily.com/) to keep focus on the main content.

### [Hide Banner User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js)

Hide/click/scrollTo elements on specific sites for better reading experience:

- [InfoQ China](https://www.infoq.cn/)
- [PanSci](https://pansci.asia/)
- [INSIDE](https://www.inside.com.tw/)
- [Los Angeles Times](https://www.latimes.com/)
- [What is Intelligence?](https://whatisintelligence.antikythera.org/)
- [Taipei Astronomical Museum News Content](https://tam.gov.taipei/News_Content.aspx)

### [Fix Floating Elements User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FixFloating.user.js)

Turn floating toolbars and sticky overlays into scrollable elements on:

- [What is Intelligence?](https://whatisintelligence.antikythera.org/)

### [Articles External New Tab User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArticlesExternalNewTab.user.js)

Open supported article links in background tabs with a ↗︎ indicator on:

- [Hacker News](https://news.ycombinator.com/)
- [The Neuron Daily](https://www.theneurondaily.com/)
- [Taipei Astronomical Museum News](https://tam.gov.taipei/)
- [Wiwi Blog](https://wiwi.blog/blog/)
- [Paul Bourke](https://paulbourke.net/)

### [Auto Open New Articles User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AutoOpenNewArticles.user.js)

Open newly published articles from Taipei Astronomical Museum, The Neuron Daily and Wiwi Blog. BetaCats reading functionality now belongs to [blog-bookmarks](https://github.com/ChrisTorng/blog-bookmarks).

### [Coding Diff Optimizer User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js)

Stretch Git diffs edge-to-edge and slim line numbers on [ChatGPT Codex tasks](https://chatgpt.com/codex) and [GitHub](https://github.com/).

### [Responsive Scroll Position Indicator User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js)

Keep solid-gray scroll markers only for long, truly visible page and nested content.

### [Translation Crash Guard User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationCrashGuard.user.js)

Prevent machine-translation DOM rewrites from crashing dynamic web applications.

### [Google Translate Page Toggle User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/GoogleTranslate.user.js)

Toggle the current page between original and Google Translate with Ctrl+Alt+S.

### [YouTube Tools User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/YouTubeTools.user.js)

Control YouTube playback speed and Android Edge fullscreen; rotate landscape embedded videos automatically.

### [Fullscreen Game View User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FullscreenGameView.user.js)

Show visible fullscreen controls on embedded videos, rotate landscape media, and preserve Nitter poster and Back behavior.

### [Better Discord User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterDiscord.user.js)

Simplify Discord input buttons; keep Android Edge keyboard layout unchanged by default, with opt-in diagnostics and experimental repair.

### [Medium Auto Reload Once User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js)

Reload [Medium](https://medium.com/) and Medium-powered domains once per session to avoid hangups.

## Test Cases

See [TestCases.md](TestCases.md) for sample URLs across the scripts.

## Installation

### Prerequisites:

1. Install [Tampermonkey](https://www.tampermonkey.net/) on your browser.
2. Turn on [Developer mode/Allow User Scripts to run user scripts](https://www.tampermonkey.net/faq.php#Q209).

### Steps:

Click a script link, click **Install** on the Tampermonkey installation page, then reload the target page.

### Shared floating-menu scripts — update together when the menu changes

**After a shared-menu change, update every installed script in this five-script group.** Standalone fullscreen and transient-control changes do not require a group update.

  - [AllGoInternetArchive.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js)
  - [InternetArchive.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js)
  - [ForceMobileView.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceMobileView.user.js)
  - [ForceDarkMode.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceDarkMode.user.js)
  - [TranslatePreformattedText.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslatePreformattedText.user.js)

---

### Independent scripts — update individually

Update each script separately as needed.

  - [HackerNewsComments.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsComments.user.js)
  - [RedirectUrls.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js)
  - [RedditHideAppPopup.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedditHideAppPopup.user.js)
  - [ArchiveToday.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js)
  - [TheNeuronDaily.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TheNeuronDaily.user.js)
  - [HideBanner.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js)
  - [FixFloating.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FixFloating.user.js)
  - [ArticlesExternalNewTab.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArticlesExternalNewTab.user.js)
  - [AutoOpenNewArticles.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AutoOpenNewArticles.user.js)
  - [CodingOptimizer.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js)
  - [ResponsiveScrollIndicator.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js)
  - [TranslationCrashGuard.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationCrashGuard.user.js)
  - [GoogleTranslate.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/GoogleTranslate.user.js)
  - [YouTubeTools.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/YouTubeTools.user.js)
  - [BetterMobileView.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterMobileView.user.js)
  - [FullscreenGameView.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FullscreenGameView.user.js)
  - [BetterDiscord.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterDiscord.user.js)
  - [Medium.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js)



## Contributing

Feel free to open an issue or submit a pull request if you encounter any bugs or have suggestions for enhancements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


**BetaCats 專屬功能移交（2026-11-23）：** 日期導覽、已讀與收合、相對熱度、手機圖片排版與 BetaCats 外部背景分頁，已改由 [blog-bookmarks 的 BlogBookmarks.user.js](https://github.com/ChrisTorng/blog-bookmarks/blob/main/tampermonkey/BlogBookmarks.user.js) 維護。其他網站的通用腳本保留於本 Repo。
