# Shared floating menu

`AllGoInternetArchive.user.js`, `InternetArchive.user.js`, `ForceMobileView.user.js`, `ForceDarkMode.user.js`, and `TranslatePreformattedText.user.js` share the floating menu implementation in `src/FloatingMenu.js`. The source is copied into each userscript between the `BEGIN SHARED FLOATING MENU` and `END SHARED FLOATING MENU` markers. After changing the shared source, run `node scripts/sync-floating-menu.js` and review all five userscripts and their tests. A change must satisfy every consumer; never edit just one generated copy.

Tampermonkey supports `@require`, but embedding the shared code keeps each installed userscript self-contained and avoids remote dependency timing and update issues. The copies coordinate through one DOM menu element rather than relying on a shared userscript JavaScript realm. The sync script is idempotent.

## Behavior

- The collapsed `≡` control starts 70 px below the top and 16 px inside the right edge. It is deliberately translucent while idle, becomes opaque while hovered, focused, or expanded, and opens downward with `→`, `↔`, `☽`, and `譯∞` in fixed order regardless of script startup order. Coarse pointers and zoomed-out views receive larger controls.
- The menu remains inside the visual viewport during scrolling, resizing, zooming, and horizontal overflow. Only `≡` is draggable; its viewport position is saved for the current hostname and clamped back into view when restored.
- Clicking anywhere outside an expanded menu collapses it. Choosing an action also collapses it and restores the subtle idle appearance. A missing or unavailable action does not leave an empty menu visible.
- The expanded `×` opens a confirmation panel instead of immediately hiding anything. The user can hide the floating features for only the current page (path and query), the current folder path, or the entire hostname, or cancel. The chosen scope is saved in origin-local storage and the page reloads after confirmation.
- Register each new floating action with a unique key and add that key to `FLOATING_MENU_ORDER`. A script excluded by Tampermonkey never registers; an action that is unavailable on the current page calls `setFloatingButtonAvailable`.
- URL-based automatic activation is independent of menu expansion. Enabled actions show their active color when expanded. All five scripts exclude `christorng.idv.tw` and its subdomains in metadata.
- The page-wide preformatted-text action (`譯∞`) stays in the shared menu while converted blocks exist and reflects whether all blocks are converted. Per-block controls and the inline-code, Mastodon, and Wikipedia translation fixes remain independent of menu expansion.

Site storage is scoped by browser origin. Page and folder exclusions are therefore applied within the current origin, while the hostname key keeps the settings separate from other hosts.

## Maintenance

Keep the userscript descriptions aligned with their concise README entries. Bump each modified `.user.js` `@version` using the current date. When site-specific URL rules change, update `TestCases.md`. Run `node --test` after synchronizing the shared code.
