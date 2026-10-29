# Current updates: install and verify

Updated: 2026-10-30

Open this page on the PR's Vercel preview to install that preview's version. After merging, the same page lists the update in production. Click the installation link below, confirm the version in Tampermonkey, and reload the test page.

## Updated userscripts (2)

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

### Better Discord — 2026-10-30_1.0.9

**[Install / update BetterDiscord.user.js](src/BetterDiscord.user.js)**

**UI changes:** On Android Edge, when the message editor has focus, expand a Discord app/chat container that incorrectly stops above the visible keyboard region, then use a measured composer offset only for any remaining gap. Restore the original layout on keyboard dismissal. Existing button simplification remains; Windows Edge is unaffected.

Test page:

- [Discord channel](https://discord.com/channels/1475861167476965439/1475861168412164149) (requires a Discord account with access; any accessible channel also works)

Verification:

1. Update the script in Tampermonkey, confirm version `2026-10-30_1.0.9`, then reload Discord in Android Edge.
2. Focus the message editor and wait for the keyboard to finish opening; the composer should sit just above the Edge bottom bar/keyboard without a large black gap.
3. Hide and reopen the keyboard, switch channels, and rotate the phone. No residual height or translation should remain after focus is lost.
4. Verify that the extra emoji/app buttons remain hidden and that the send button still works.
5. Open the same page in Windows Edge and confirm that keyboard layout corrections are never applied.

**Update scope:** BetterDiscord.user.js is independent of the Reddit script and shared floating-menu scripts; no coordinated updates are necessary.

## Verification notes

`node --test scripts/test-reddit-hide-app-popup.js` covers early style injection, two known blocker variants, translated app-prompt detection, unrelated bottom sheets, delayed popup insertion, repeated scroll locks, and late document-root creation using an explicit DOM harness. This does not replace live Android Edge verification of Reddit's current A/B variants.

`node --test scripts/test-better-discord.js` covers existing composer behavior and mocked Android Edge keyboard gap scenarios, including a clipped app root, a nested chat container, repeated viewport events, restoration, and Windows Edge exclusion. Live Android Edge verification is required for the browser-native keyboard bounds.
