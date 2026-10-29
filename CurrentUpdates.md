# Current updates: install and verify

Updated: 2026-10-30

Open this page on the PR's Vercel preview to install that preview's version. After merging, the same page lists the update in production. Click the installation link below, confirm the version in Tampermonkey, and reload the test page.

## Updated userscripts (1)

### Reddit Hide App Popup — 2026-10-30_1.0.0

**[Install / update RedditHideAppPopup.user.js](src/RedditHideAppPopup.user.js)**

**UI changes:** On Reddit mobile pages, suppress the blocking "get the app to continue" prompt without redirecting away from reddit.com. Restore page scrolling and touch interaction after the prompt appears. No new buttons or menus are added; unrelated dialogs remain unchanged. The existing RedirectUrls script is not modified.

Test pages:

- [Reddit article and comments](https://www.reddit.com/r/robotics/comments/1ps2aw1/in_china_robots_are_now_handling_the_solar_panels/)
- [Reddit subreddit listing](https://www.reddit.com/r/robotics/)

Verification:

1. Install or update the script in Tampermonkey, confirm version `2026-10-30_1.0.0`, then reload Reddit in Android Edge.
2. Browse Reddit while signed out until the usual blocking app prompt would appear. The prompt and its overlay should remain hidden.
3. Continue scrolling and selecting comments or links without refreshing the page; check both touch gestures and page navigation.
4. Open another post and return to the listing. The script must not redirect to any third-party Reddit frontend.
5. If an ordinary dialog such as a sort menu opens, confirm it is not suppressed.

**Update scope:** Only RedditHideAppPopup.user.js needs installation. RedirectUrls.user.js and shared floating-menu scripts are unchanged.

## Verification notes

`node --test scripts/test-reddit-hide-app-popup.js` covers early style injection, two known blocker variants, translated app-prompt detection, unrelated bottom sheets, delayed popup insertion, repeated scroll locks, and late document-root creation using an explicit DOM harness. This does not replace live Android Edge verification of Reddit's current A/B variants.
