# Test status legend
- `AUTOMATED`: covered by automated runtime tests in `node --test`.
- `LIMITED`: automated coverage is intentionally limited to URL/rule/detection logic because the sample is anti-bot, auth-only, or otherwise unsuitable for full content-driven validation.
- `N/A`: reference sample with no matching userscript behavior expected.

# CloudMark
Section note: Node runtime tests inject the userscript into article DOM reconstructed from the existing BetaCat capture. GM storage/requests, closed Shadow DOM, and native dialogs are mocked; Android Edge touch layout and real Tampermonkey permissions require device verification.
- https://hackernews.betacat.io/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED_WITH_MOCKS] (one save button per topic; instant cached menus, background saves, independent retry notices, stale-response protection, preserved input focus, top-right category badges, recategorization without duplicates, explicit close, inline category creation, collection switching/creation, token migration, title/summary payload, duplicates, retries, and dynamic articles)
- https://hackernews.betacat.io/zh [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED_WITH_MOCKS] (Chinese listing URL with captured article DOM)
- https://hackernews.betacat.io/daily/2026-10-29/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED_WITH_MOCKS] (dated listing URL with captured article DOM)
- [Local CloudMark demo](tests/CloudMark/index.html) [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: MANUAL] (interactive delayed-response and save-failure demo using a fake token and in-memory API; no network writes)

# Hacker News Comments
Section note: automated tests inject the userscript into a local article DOM and mock the Hacker News Algolia API, per-tab navigation history, search-engine referrers, and query-specific app URLs.
- https://blog.exe.dev/engineering-with-ai [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED]
- https://openai.com/index/our-decision-on-cursor-following-its-acquisition-by-spacex/ [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (exact URL lookup and cross-origin Tampermonkey request are mocked; live page capture is blocked by an anti-bot challenge)
- https://www.latimes.com/environment/story/2026-08-26/highest-ever-ocean-temperature-measured-as-powerful-el-nino-forms [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (exact URL lookup and button remounting are automated; live content is replaced by an anti-ad-block message)

# RedirectUrls
Section note: X/Twitter tests validate Shitter post targets, referrer skips, and session-based Back navigation locally; live Shitter content requires browser validation. Reddit tests check direct www browsing, old-to-www redirects, old-site login (`reason=lor2`) recovery, and Back navigation without a Reddit account. Login recovery is URL-only/mocked; mobile browser behavior requires live testing.
- https://x.com/cocktailpeanut/status/1860756706357022812 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (redirects to https://shitter.thepixora.com/cocktailpeanut/status/1860756706357022812)
- https://twitter.com/cocktailpeanut/status/1860756706357022812 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (same Shitter target; reuses the captured X fixture)
- https://www.reddit.com/r/robotics/comments/1ps2aw1/in_china_robots_are_now_handling_the_solar_panels/ [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (remains on www.reddit.com; no third-party redirect)
- https://old.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/ [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (redirects to matching www.reddit.com URL, with a Back-navigation skip)
- https://www.reddit.com/login/?reason=lor2&dest=https%3A%2F%2Fold.reddit.com%2Fr%2Flinux%2Fcomments%2F1puojsr%2Fthe_device_that_controls_my_insulin_pump_uses_the%2F [CONTENT_CLASS: VALID_AUTH_REQUIRED] [TEST_STATUS: LIMITED] (simulated login URL recovers the corresponding www.reddit.com thread; normal login URLs are excluded; no login HTML capture)
- https://github.com/ChrisTorng/TampermonkeyScripts?tab=readme-ov-file [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (redirects to repository home and Back returns here without re-triggering)
- https://arxiv.org/abs/2402.07939v1 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED]
- https://arxiv.org/pdf/2402.07939v1 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED]

# Reddit Hide App Popup
Section note: Node.js runtime DOM-harness tests simulate known and localized Reddit app popups, late injection, scroll-lock recovery, non-app dialogs, and early script startup. The mobile app-blocker DOM is not yet captured from a live session, so Android browser behavior requires manual validation.
- https://www.reddit.com/r/robotics/comments/1ps2aw1/in_china_robots_are_now_handling_the_solar_panels/ [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: LIMITED] (automated runtime tests use synthetic popup and scroll-lock DOM; actual blocking prompt and phone touch scrolling require live validation)

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
Section note: the Wayback fallback → action uses the shared floating menu and is covered by local DOM tests.
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
- https://whatisintelligence.antikythera.org/chapter-02/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED]
- https://tam.gov.taipei/News_Content.aspx?n=EF86D8AF23B9A85B&sms=F32C4FF0AC5C2801&s=AB8D80ADF566657B [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED]
- https://tam.gov.taipei/News_Content.aspx?n=EF86D8AF23B9A85B&sms=F32C4FF0AC5C2801&s=EA498826874ED925 [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED]

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
- https://paulbourke.net/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (all-link behavior is validated with a local DOM harness)

# AutoOpenNewArticles
Section note: automated tests inject the script and mock `GM_getValue`, `GM_setValue`, and `GM_openInTab`.
- https://hackernews.betacat.io/#sort=time&order=asc [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (fixed lower-left page collapse control, clearer read state, scroll-to-top read marking, reload persistence boundaries, and Latest-versus-dated-archive navigation are validated with a local DOM harness)
- https://hackernews.betacat.io/daily/2026-03-07 [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (responsive top and bottom navigation uses available archive dates, keeps Latest separate after the newest date, and disables only the true endpoints)
- https://tam.gov.taipei/News_Photo.aspx?n=EF86D8AF23B9A85B [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED]
- https://tam.gov.taipei/News_Link_pic.aspx?n=B64052C7930D4913 [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED]
- https://www.theneurondaily.com/ [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: AUTOMATED] (listing detection and new-item open flow validated with local DOM harness)
- https://www.theneurondaily.com/archive [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: AUTOMATED] (listing detection and new-item open flow validated with local DOM harness)
- https://wiwi.blog/blog/ [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (listing detection, new-item open flow, and active-tab cache-busting reload validated with local DOM harness)

# Coding Diff Optimizer
- https://chatgpt.com/codex/tasks/task_e_68e41a320a388322a04ba2f35d096cd7 [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (anti-bot sample; synthetic diff selector on supported Codex URL)
- https://github.com/ChrisTorng/TampermonkeyScripts/pull/7/files [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]
- https://github.com/ChrisTorng/TampermonkeyScripts/commit/267c2b3f52c428e3b68b9560ed165cb21dfa4602 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]

# Responsive Scroll Position Indicator
- https://mastodon.social/@firefoxwebdevs/115740500373677782 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING]
- https://indieweb.org/POSSE [CONTENT_CLASS: VALID_ARTICLE_CONTENT]

# Translation Crash Guard
Section note: automated tests cover the DOM operation guard with a local harness; Android Edge machine-translation UI still needs manual device validation.
- https://twitterwebviewer.com/?tweet=1860756706357022812 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (target Twitter Viewer page used for the Android Edge auto-translation crash report)

# Translate Preformatted Text
Section note: automated tests use representative inline code, preformatted blocks, Mastodon app markers, mobile Wikipedia sections, and the shared floating menu in the local DOM harness; live browser translation still requires manual validation.
- https://github.com/anthropics/fermats-last-theorem [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (inline code replacement is automated; nested scrollport clipping and scrollbar clearance use explicit DOM rectangles and the local browser reproduction below, not a complete live GitHub capture)
- [Local translation and fullscreen controls](tests/ControlButtons/index.html) [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (headless Chromium checks visible and clickable translation controls at left, middle, and right scroll positions, conversion/restoration, and dim fullscreen styling; the frame scheduler and scroll-event delivery are explicit test substitutions)
- https://codex-tool-reference.simonw.chatgpt.site/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (conditional visibility, per-block and page-wide toggling, active styling, and dynamically added blocks are automated; visible-bottom placement, mouse/touch dragging without activation or persistence, scrolling, and resizing use explicit mock rectangles in the DOM harness)
- https://simonwillison.net/2026/Sep/2/claudes-new-system-prompt/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (captured code-only quotations receive per-block translation controls and can be toggled without treating their code as inline content)
- https://github.com/okf-memory/okf-agent-memory/blob/main/README.md?plain=1 [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (captured GitHub source view receives an opt-in translation control and preserves line breaks when toggled)
- https://github.com/okf-memory/okf-agent-memory/blob/main/README.md [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (captured rendered Mermaid container receives a visible opt-in translation control)
- https://en.wikipedia.org/wiki/Parque_Arqueol%C3%B3gico_do_Solst%C3%ADcio [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (initial and dynamically collapsed mobile sections are kept visible; machine-translation output requires manual validation)
- https://mathstodon.xyz/@tao/117237320796901560 [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (captured Mastodon app marker is detected without a host allowlist and its translation opt-out is removed; machine-translation output requires manual validation)

# YouTube Tools
- https://www.youtube.com/watch?v=nCg3aXn5F3M [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (desktop/landscape arrow, current-rate and arrow regions are separate; compact overlapping label is used only on narrow portrait touch screens; hover feedback, selected preset highlighting/disabled state and native ratechange synchronization are covered by the DOM harness)
- https://m.youtube.com/watch?v=zeWBx3AePow [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: LIMITED] (Android Edge alternative fullscreen, centered one-second speed reveal, native fullscreen control suppression, playback and orientation restoration are covered by the DOM harness; real mobile compositor and touch layout require physical-device verification)

# Force Mobile View
Section note: 18 DOM-harness tests cover detection, viewport, rollback, and manual toggle; Android Edge needs further refinement.
- https://data.stackexchange.com/stackoverflow/query/1926661#graph?t=1 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: LIMITED] (simulated layout; live editor/graph needs verification)
- https://news.ycombinator.com/item?id=46255285 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED]
- https://archive.is/75aY9 [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED]
- https://lcamtuf.coredump.cx/prep/index-old.shtml [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (tiny text alone does not always trigger)
- https://daringfireball.net/2026/03/your_frustration_is_the_product [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: LIMITED] (spacing tested in DOM mocks)
- https://steveblank.com/2026/04/09/nowhere-is-safe/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (line-height regression via DOM mocks)
- https://paulbourke.net/geometry/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (URL auto-enable)

# Better Mobile View
- https://hackernews.betacat.io/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT]

# Fullscreen Game View
Section note: automated tests inject the userscript into a representative ARC Prize game DOM and mock the browser fullscreen API fallback. Transient-control regression tests also cover pinch-zoom position stability, inverse scaling, and collision avoidance with the separate `≡` menu. Actual mobile pinch gestures require manual validation.
- [Local fullscreen test canvas](tests/ControlButtons/index.html#test-game) [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (headless Chromium verifies compact translucent entry styling, hidden expanded controls, and pre-entry page scroll restoration after Escape/Back even with smooth scrolling enabled; native fullscreen events and dragging use explicit runtime mocks, with manual browser steps in CurrentUpdates.md)
- https://arcprize.org/tasks/ls20 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED] (mobile width and D-pad repairs, fullscreen state events, Escape/Back exit, scroll/focus restoration, delayed layout resets, and rapid re-entry use explicit runtime mocks; mouse/touch dragging uses mock rectangles; visual layout still requires manual device validation)

# Better Discord
Section note: automated DOM tests cover composer cleanup, default-off Android Edge layout preservation, opt-in experimental viewport repair, diagnostic open/close restoration, and Windows Edge exclusion. Actual viewport values and blank-gap causes still require live Android Edge screenshots and settled (1.5–2.5 second) JSON samples. No chat contents, cookies, tokens, or complete URLs are logged.
- https://discord.com/channels/1475861167476965439/1475861168412164149 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED_WITH_MOCKS]
- https://discord.com/channels/1475861167476965439/1475861168412164149?bddebug=1 [CONTENT_CLASS: VALID_NON_ARTICLE_OR_LISTING] [TEST_STATUS: AUTOMATED_WITH_MOCKS_AND_LIVE_ANDROID_REQUIRED]

# Force Dark Mode
Section note: automated tests inject the script, mock `GM_info`, and cover the shared menu toggle.
- https://www.lesswrong.com/rationality [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED]

# Shared Floating Menu
Section note: local DOM tests run the four main userscripts together, exercise the Wayback fallback, and cover stable order, missing actions, per-host drag persistence, site disablement, and the forbidden domain.
- https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/ [CONTENT_CLASS: VALID_ARTICLE_CONTENT] [TEST_STATUS: AUTOMATED] (Archive Today floating action routes to its submit URL)

# Medium Auto Reload Once
- https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (anti-bot sample; Medium detection and reload-once/session logic only)
- https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Fuxdesign.cc%2Ffear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950 [CONTENT_CLASS: INVALID_ANTI_BOT] [TEST_STATUS: LIMITED] (global-identity reload skip logic only)
  - Expect a single reload even if Medium rewrites the redirectUrl query parameters on subsequent visits.

