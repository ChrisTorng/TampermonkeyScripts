# [Tampermonkey Scripts](https://github.com/ChrisTorng/TampermonkeyScripts)

Some useful [Tampermonkey](https://www.tampermonkey.net/) scripts for browser tasks.

**[Current updates: install the changed scripts and verify them](CurrentUpdates.md)**

## Shared floating-menu scripts — update together when the menu changes

**When the shared menu implementation changes, update all five scripts below together** to keep the menu consistent. Independent feature updates (such as Fullscreen Game View or an individual block control) do not require a five-script menu update.

### [All Go Internet Archive User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js)

Add a quick Internet Archive action in the shared floating menu and mark Archive Today links.

### [Internet Archive User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js)

Send most paywall articles to [Internet Archive](https://web.archive.org) for archiving, hide fixed titles, and offer an [Archive Today](https://archive.is) fallback.

- **From** [https://www.rawstory.com/laura-loomer-vs-elon-musk/](https://www.rawstory.com/laura-loomer-vs-elon-musk/)
- **Redirected to** [https://web.archive.org/web/20250106005830/https://www.rawstory.com/laura-loomer-vs-elon-musk/](https://web.archive.org/web/20250106005830/https://www.rawstory.com/laura-loomer-vs-elon-musk/)

### [Force Mobile View User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceMobileView.user.js)

Detect unreadably small mobile pages, apply reversible readability fixes, and retain manual / URL-based ↔ controls.

### [Force Dark Mode User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceDarkMode.user.js)

Force dark colors with a shared-menu ☽ toggle and URL-based auto-enable.

### [Translate Preformatted Text User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslatePreformattedText.user.js)

Translate code blocks with draggable per-block controls and a shared-menu action; improve inline code, Mastodon, and Wikipedia translation.

---

## Independent scripts — update individually

Update each script below separately as needed.

### [CloudMark User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CloudMark.user.js)

Add Cloudmark save buttons after Hacker News Summary topic links, preserving article titles and summaries.

### [Hacker News Comments User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsComments.user.js)

Add an article button for Hacker News comments, including pages reached through redirects.

### [RedirectUrls User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js)

Redirect supported pages to more readable destinations while preserving back navigation.

Supported sites:
- [X](https://x.com/) / [Twitter](https://twitter.com/) status pages → [Shitter](https://shitter.thepixora.com/) for lightweight, account-free viewing
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
- [Hacker News Summary](https://hackernews.betacat.io/)
- [The Neuron Daily](https://www.theneurondaily.com/)
- [Taipei Astronomical Museum News](https://tam.gov.taipei/)
- [Wiwi Blog](https://wiwi.blog/blog/)
- [Paul Bourke](https://paulbourke.net/)

### [Auto Open New Articles User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AutoOpenNewArticles.user.js)

Add clear read states, fixed collapse controls, and separate dated archive/Latest navigation to Hacker News Summary; track and auto-open new items on other supported sites.

### [Coding Diff Optimizer User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js)

Stretch Git diffs edge-to-edge and slim line numbers on [ChatGPT Codex tasks](https://chatgpt.com/codex) and [GitHub](https://github.com/).

### [Responsive Scroll Position Indicator User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js)

Show thin, fixed vertical markers that track scroll position for every scrollable area on the page.

### [Translation Crash Guard User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationCrashGuard.user.js)

Prevent machine-translation DOM rewrites from crashing dynamic web applications.

### [Google Translate Page Toggle User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/GoogleTranslate.user.js)

Toggle the current page between original and Google Translate with Ctrl+Alt+S.

### [YouTube Tools User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/YouTubeTools.user.js)

Show responsive YouTube playback-speed controls with highlighted active presets and Android Edge alternative fullscreen.

### [Better Mobile View User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterMobileView.user.js)

Expand Hacker News Summary article images to full width in portrait mobile view.

### [Fullscreen Game View User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FullscreenGameView.user.js)

Fit embedded games to mobile screens with a translucent, pinch-zoom-stable fullscreen button; restore page position on exit.

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

  - [CloudMark.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CloudMark.user.js)
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

