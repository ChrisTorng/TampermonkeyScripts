# Test status legend
- `AUTOMATED`: covered by automated runtime tests in `node --test`.
- `LIMITED`: automated coverage is intentionally limited to URL/rule/detection logic because the sample is anti-bot, auth-only, or otherwise unsuitable for full content-driven validation.
- `N/A`: reference sample with no matching userscript behavior expected.

# RedirectUrls
- https://x.com/cocktailpeanut/status/1860756706357022812 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]
- https://www.reddit.com/r/robotics/comments/1ps2aw1/in_china_robots_are_now_handling_the_solar_panels/ [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]
- https://old.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/ [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]
- https://github.com/ChrisTorng/TampermonkeyScripts?tab=readme-ov-file [CONTENT_CLASS: VALID_ARTICLE_CONTENT] (redirects to repository home and Back returns here without re-triggering)
- https://arxiv.org/abs/2402.07939v1 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]
- https://arxiv.org/pdf/2402.07939v1 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]

# Archive Today
- https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://www.economist.com/interactive/christmas-specials/2024/12/21/the-chart-of-everything [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (anti-bot sample; redirect rule only)
- https://www.ft.com/content/a3eeb268-5daa-4525-858b-eab93b28d3c7 [CONTENT_CLASS: VALID_AUTH_REQUIRED]
- https://www.nature.com/articles/d41586-025-00648-5 [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://www.newscientist.com/article/2458385-ai-uses-throat-vibrations-to-work-out-what-someone-is-trying-to-say/ [CONTENT_CLASS: VALID_AUTH_REQUIRED]
- https://www.newyorker.com/magazine/2025/02/17/the-long-flight-to-teach-an-endangered-ibis-species-to-migrate [CONTENT_CLASS: VALID_AUTH_REQUIRED]
- https://www.nytimes.com/2024/12/23/health/mpox-spread-congo-kinshasa.html [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (anti-bot sample; redirect rule only)
- https://www.theatlantic.com/magazine/archive/2025/02/american-loneliness-personality-politics/681091/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://www.theatlantic.com/health/archive/2015/07/split-brain-research-sperry-gazzaniga/399290/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://www.wired.com/story/elon-musk-government-young-engineers/ [CONTENT_CLASS: VALID_AUTH_REQUIRED]
- https://www.wsj.com/world/dozens-feared-dead-in-crash-after-passenger-flight-diverts-from-russia-fb2cdf2c [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (anti-bot sample; redirect rule only)

# Internet Archive
- https://www.lrb.co.uk/the-paper/v47/n01/fraser-macdonald/diary [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://www.rawstory.com/laura-loomer-vs-elon-musk/ [CONTENT_CLASS: VALID_AUTH_REQUIRED]
- https://www.smh.com.au/business/the-economy/trump-is-changing-the-narratives-on-both-sides-of-the-atlantic-20250310-p5liav.html [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://www.theverge.com/2025/1/15/24343794/google-workspace-ai-features-free [CONTENT_CLASS: VALID_ARTICLE_CONTENT]

# Previous Internet Archive, now Archive Today, waiting for next sample
- https://www.newyorker.com/news/the-lede/geothermal-power-is-a-climate-moon-shot-beneath-our-feet [CONTENT_CLASS: VALID_AUTH_REQUIRED]

# None
- https://www.nature.com/articles/d41586-025-00264-3 [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: N/A] (no matching site-specific script behavior)

# HideBanner
- https://www.infoq.cn/article/mjPeD7eDL2XKNNd6zs3M [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://pansci.asia/archives/380040 [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://www.inside.com.tw/article/40278-is-taiwan-the-worlds-best-use-case-for-stablecoins [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://www.latimes.com/environment/story/2025-12-18/state-regulators-vote-to-keep-utility-profits-high-angering-customers [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://whatisintelligence.antikythera.org/chapter-02/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT]

# Fix Floating Elements
- https://whatisintelligence.antikythera.org/chapter-02/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT]

# ArticlesExternalNewTab
Section note: automated tests inject the script and mock `GM_openInTab`.
- https://news.ycombinator.com/ [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]
- https://hackernews.betacat.io/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://www.theneurondaily.com/ [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (anti-bot sample; URL/link rule only)
- https://www.theneurondaily.com/p/you-can-now-build-agents-and-apps-inside-chatgpt [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (anti-bot sample; URL/link rule only)
- https://tam.gov.taipei/News_Photo.aspx?n=EF86D8AF23B9A85B&sms=F32C4FF0AC5C2801 [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://tam.gov.taipei/News_Link_pic.aspx?n=B64052C7930D4913&sms=2CF1F5E2E0B96411 [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://wiwi.blog/blog/ [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED]

# AutoOpenNewArticles
Section note: automated tests inject the script and mock `GM_getValue`, `GM_setValue`, and `GM_openInTab`.
- https://tam.gov.taipei/News_Photo.aspx?n=EF86D8AF23B9A85B [CONTENT_CLASS: VALID_ARTICLE_CONTENT]
- https://tam.gov.taipei/News_Link_pic.aspx?n=B64052C7930D4913 [CONTENT_CLASS: VALID_ARTICLE_CONTENT]

# Coding Diff Optimizer
- https://chatgpt.com/codex/tasks/task_e_68e41a320a388322a04ba2f35d096cd7 [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (anti-bot sample; synthetic diff selector on supported Codex URL)
- https://github.com/ChrisTorng/TampermonkeyScripts/pull/7/files [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]
- https://github.com/ChrisTorng/TampermonkeyScripts/commit/267c2b3f52c428e3b68b9560ed165cb21dfa4602 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]

# Responsive Scroll Position Indicator
- https://mastodon.social/@firefoxwebdevs/115740500373677782 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]
- https://indieweb.org/POSSE [CONTENT_CLASS: VALID_ARTICLE_CONTENT]

# YouTube Tools
- https://www.youtube.com/watch?v=nCg3aXn5F3M [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]

# Force Mobile View
Section note: automated tests inject the script and mock `GM_info`.
- https://news.ycombinator.com/item?id=46255285 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED]
- https://archive.is/75aY9 [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED]
- https://lcamtuf.coredump.cx/prep/index-old.shtml [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (tiny-font auto-enable behavior)

# Better Mobile View
- https://hackernews.betacat.io/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT]

# Force Dark Mode
Section note: automated tests inject the script and mock `GM_info`.
- https://www.lesswrong.com/rationality [CONTENT_CLASS: VALID_ARTICLE_CONTENT]

# Medium Auto Reload Once
- https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (anti-bot sample; Medium detection and reload-once/session logic only)
- https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Fuxdesign.cc%2Ffear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950 [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (global-identity reload skip logic only)
  - Expect a single reload even if Medium rewrites the redirectUrl query parameters on subsequent visits.
