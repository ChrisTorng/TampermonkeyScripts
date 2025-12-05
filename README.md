# [Tampermonkey Scripts](https://github.com/ChrisTorng/TampermonkeyScripts)

Some useful [Tampermonkey](https://www.tampermonkey.net/) scripts for browser tasks.

## [RedirectX User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectX.user.js)

Automatically redirect [X](https://x.com/)/[Twitter](https://twitter.com) links into [Nitter](https://nitter.net/) for lightweight viewing, while still allowing you to go back to the original X/Twitter page.

- **From** [https://x.com/cocktailpeanut/status/1860756706357022812](https://x.com/cocktailpeanut/status/1860756706357022812)
- **Redirected to** [https://nitter.net/cocktailpeanut/status/1860756706357022812](https://nitter.net/cocktailpeanut/status/1860756706357022812)

## [All Go Internet Archive User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js)

Provide all sites [→] button to go to [Internet Archive](https://web.archive.org) for testing.

## [Internet Archive User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js)

Automatically redirect most paywall articles to [Internet Archive](https://web.archive.org) for archiving. And hide the fixed title. Supports go to the same page on [Archive Today](https://archive.is).

- **From** [https://www.rawstory.com/laura-loomer-vs-elon-musk/](https://www.rawstory.com/laura-loomer-vs-elon-musk/)
- **Redirected to** [https://web.archive.org/web/20250106005830/https://www.rawstory.com/laura-loomer-vs-elon-musk/](https://web.archive.org/web/20250106005830/https://www.rawstory.com/laura-loomer-vs-elon-musk/)

## [Archive Today User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js)

Automatically redirect some other paywall articles to [Archive Today](https://archive.is) for archiving. And hide the prompt, scroll into content page.

- **From** [https://www.bloomberg.com/opinion/articles/2024-12-12/exxon-s-ai-power-play-aims-to-beat-nuclear](https://www.bloomberg.com/opinion/articles/2024-12-12/exxon-s-ai-power-play-aims-to-beat-nuclear)
- **Redirected to** [https://archive.is/submit/?url=https%3A%2F%2Fwww.bloomberg.com%2Fopinion%2Farticles%2F2024-12-12%2Fexxon-s-ai-power-play-aims-to-beat-nuclear](https://archive.is/submit/?url=https%3A%2F%2Fwww.bloomberg.com%2Fopinion%2Farticles%2F2024-12-12%2Fexxon-s-ai-power-play-aims-to-beat-nuclear)

## [ArXiv User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArXiv.user.js)

Automatically redirect to the HTML version of [ArXiv](https://arxiv.org/) papers.

- **From** [https://arxiv.org/abs/2402.07939v1](https://arxiv.org/abs/2402.07939v1)
- **Redirected to** [https://arxiv.org/html/2402.07939v1](https://arxiv.org/html/2402.07939v1)

## [The Neuron Daily User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TheNeuronDaily.user.js)

Hide unnecessary elements on [The Neuron Daily](https://www.theneurondaily.com/) site to focus on the main content.

## [Hide Banner User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js)

Hide/click/scrollTo elements on specific sites for better reading experience:

- [InfoQ China](https://www.infoq.cn/)
- [PanSci](https://pansci.asia/)
- [INSIDE](https://www.inside.com.tw/)

## [Fix Floating Elements User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FixFloating.user.js)

Automatically convert floating toolbars and sticky overlays into scrolling elements so they no longer block the reading area. Currently optimized for [What is Intelligence?](https://whatisintelligence.antikythera.org/), with an easy configuration structure for future sites.

## [Articles External New Tab User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArticlesExternalNewTab.user.js)

Ensure external story links on [Hacker News](https://news.ycombinator.com/), [hackernews.betacat.io](https://hackernews.betacat.io/), [The Neuron Daily](https://www.theneurondaily.com/), and [Taipei City Government news galleries](https://tam.gov.taipei/) open in background tabs and display a ↗︎ icon indicator.

## [Coding Diff Mobile Optimizer User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js)

Maximize the readable area of Git diffs on mobile portrait layouts for [ChatGPT Codex tasks](https://chatgpt.com/codex) and [GitHub](https://github.com/) by stretching file containers edge-to-edge and slimming line number columns.

## [Responsive Scroll Position Indicator User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js)

Show a thinner, fixed horizontal indicator at the top of every page to visualize your current vertical scroll position and viewport height. A minimum visible width keeps the indicator noticeable even on very long pages, the layout stays touch-friendly for mobile users, and the bar tracks the visual viewport so it remains aligned with the zoomed-in on-screen region while shrinking the viewport marker to match the reduced visible height.

## [Medium Auto Scroll User Script](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js)

Automatically scroll to bottom then back to top on [Medium](https://medium.com/) sites to trigger full article content loading. Also supports sites redirected from Medium's global-identity-2 redirect URLs.

- **Test Case 1 - Direct Medium**: [https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b](https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b)
- **Test Case 2 - Medium Redirect**: [https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Fuxdesign.cc%2Ffear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950](https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Fuxdesign.cc%2Ffear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950)

See [Test Cases](TestCases.md) for more details.

## Installation

### Prerequisites:

1. Install [Tampermonkey](https://www.tampermonkey.net/) on your browser.
2. Turn on [Developer mode to run user scripts](https://www.tampermonkey.net/faq.php#Q209).

### Steps:

1. Click anyone you need:

  - [RedirectX.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectX.user.js)
  - [AllGoInternetArchive.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js)
  - [InternetArchive.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js)
  - [ArchiveToday.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js)
  - [ArXiv.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArXiv.user.js)
  - [TheNeuronDaily.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TheNeuronDaily.user.js)
  - [HideBanner.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js)
  - [FixFloating.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FixFloating.user.js)
  - [ArticlesExternalNewTab.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArticlesExternalNewTab.user.js)
  - [CodingOptimizer.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js)
  - [ResponsiveScrollIndicator.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js)
  - [Medium.user.js](https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js)


2. Tampermonkey Install page opened, click [Install] button to install.
3. Reload the target page.

## Contributing

Feel free to open an issue or submit a pull request if you encounter any bugs or have suggestions for enhancements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.