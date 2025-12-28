# [Tampermonkey Scripts](https://github.com/ChrisTorng/TampermonkeyScripts)

Some useful [Tampermonkey](https://www.tampermonkey.net/) scripts for browser tasks.

## [RedirectUrls User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js)

Redirect supported pages to more readable destinations while preserving back navigation.

Supported sites:
- [X](https://x.com/) / [Twitter](https://twitter.com/) status pages → [Nitter](https://nitter.net/) status pages for a lighter viewer
- [Reddit](https://www.reddit.com/) threads (www/old) → [rdx.overdevs.com](https://rdx.overdevs.com/) comment reader
- [GitHub](https://github.com/) repository `readme-ov-file` tab → repository main page on GitHub
- [arXiv](https://arxiv.org/) abs/pdf pages → arXiv HTML view

## [All Go Internet Archive User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js)

Add a quick Internet Archive link on any site for testing snapshots.

## [Internet Archive User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js)

Send most paywall articles to [Internet Archive](https://web.archive.org) for archiving, hide fixed titles, and offer an [Archive Today](https://archive.is) fallback.

- **From** [https://www.rawstory.com/laura-loomer-vs-elon-musk/](https://www.rawstory.com/laura-loomer-vs-elon-musk/)
- **Redirected to** [https://web.archive.org/web/20250106005830/https://www.rawstory.com/laura-loomer-vs-elon-musk/](https://web.archive.org/web/20250106005830/https://www.rawstory.com/laura-loomer-vs-elon-musk/)

## [Archive Today User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js)

Redirect selected paywall pages to [Archive Today](https://archive.is), hide prompts, and jump into the content.

- **From** [https://www.bloomberg.com/opinion/articles/2024-12-12/exxon-s-ai-power-play-aims-to-beat-nuclear](https://www.bloomberg.com/opinion/articles/2024-12-12/exxon-s-ai-power-play-aims-to-beat-nuclear)
- **Redirected to** [https://archive.is/submit/?url=https%3A%2F%2Fwww.bloomberg.com%2Fopinion%2Farticles%2F2024-12-12%2Fexxon-s-ai-power-play-aims-to-beat-nuclear](https://archive.is/submit/?url=https%3A%2F%2Fwww.bloomberg.com%2Fopinion%2Farticles%2F2024-12-12%2Fexxon-s-ai-power-play-aims-to-beat-nuclear)

## [The Neuron Daily User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TheNeuronDaily.user.js)

Hide non-essential elements on [The Neuron Daily](https://www.theneurondaily.com/) to keep focus on the main content.

## [Hide Banner User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js)

Hide/click/scrollTo elements on specific sites for better reading experience:

- [InfoQ China](https://www.infoq.cn/)
- [PanSci](https://pansci.asia/)
- [INSIDE](https://www.inside.com.tw/)
- [Los Angeles Times](https://www.latimes.com/)
- [What is Intelligence?](https://whatisintelligence.antikythera.org/)

## [Fix Floating Elements User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FixFloating.user.js)

Turn floating toolbars and sticky overlays into scrollable elements on:

- [What is Intelligence?](https://whatisintelligence.antikythera.org/)

## [Articles External New Tab User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArticlesExternalNewTab.user.js)

Open external links in background tabs with a ↗︎ indicator on:

- [Hacker News](https://news.ycombinator.com/)
- [Hacker News Summary](https://hackernews.betacat.io/)
- [The Neuron Daily](https://www.theneurondaily.com/)
- [Taipei Astronomical Museum News](https://tam.gov.taipei/)

## [Coding Diff Optimizer User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js)

Stretch Git diffs edge-to-edge and slim line numbers on [ChatGPT Codex tasks](https://chatgpt.com/codex) and [GitHub](https://github.com/).

## [Responsive Scroll Position Indicator User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js)

Show thin, fixed vertical markers that track scroll position for every scrollable area on the page.

## [Google Translate Page Toggle User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/GoogleTranslate.user.js)

Toggle the current page between original and Google Translate with Alt+S.

## [YouTube Tools User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/YouTubeTools.user.js)

Show a top-right YouTube tools overlay with « » speed controls and the current playback rate on watch pages.

## [Force Mobile View User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceMobileView.user.js)

Keep pages within the viewport width, wrap long content, and expose a draggable top-right ↔ toggle button with auto-enable for matched URLs.

## [Medium Auto Reload Once User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js)

Reload [Medium](https://medium.com/) and Medium-powered domains once per session to avoid hangups.

## Test Cases

See [TestCases.md](TestCases.md) for sample URLs across the scripts.

## Installation

### Prerequisites:

1. Install [Tampermonkey](https://www.tampermonkey.net/) on your browser.
2. Turn on [Developer mode/Allow User Scripts to run user scripts](https://www.tampermonkey.net/faq.php#Q209).

### Steps:

1. Click anyone you need:

  - [RedirectUrls.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js)
  - [AllGoInternetArchive.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js)
  - [InternetArchive.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js)
  - [ArchiveToday.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js)
  - [TheNeuronDaily.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TheNeuronDaily.user.js)
  - [HideBanner.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js)
  - [FixFloating.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FixFloating.user.js)
  - [ArticlesExternalNewTab.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArticlesExternalNewTab.user.js)
  - [CodingOptimizer.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js)
  - [ResponsiveScrollIndicator.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js)
  - [GoogleTranslate.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/GoogleTranslate.user.js)
  - [YouTubeTools.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/YouTubeTools.user.js)
  - [ForceMobileView.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceMobileView.user.js)
  - [Medium.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js)


2. Tampermonkey Install page opened, click [Install] button to install.
3. Reload the target page.

## Contributing

Feel free to open an issue or submit a pull request if you encounter any bugs or have suggestions for enhancements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
