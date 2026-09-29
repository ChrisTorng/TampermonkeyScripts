# Shared floating menu

`AllGoInternetArchive.user.js`, `InternetArchive.user.js`, `ForceMobileView.user.js`, `ForceDarkMode.user.js`, and `TranslatePreformattedText.user.js` share the floating menu implementation in `src/FloatingMenu.js`. The source is copied into each userscript between the `BEGIN SHARED FLOATING MENU` and `END SHARED FLOATING MENU` markers. After changing the shared source, run `node scripts/sync-floating-menu.js` and review all five userscripts and their tests. A change must satisfy every consumer; never edit just one generated copy.

Tampermonkey supports `@require`, but embedding the shared code keeps each installed userscript self-contained and avoids remote dependency timing and update issues. The copies coordinate through one DOM menu element rather than relying on a shared userscript JavaScript realm. The sync script is idempotent.

## Behavior

- The collapsed `≡` control starts at the previous archive arrow position, 70 px below the top and flush with the right edge. Its menu opens downward with `→`, `↔`, `☽`, and `譯∞` in that fixed order, regardless of script startup order. `InternetArchive.user.js` supplies the `→` action on Wayback pages. The `×` control appears above `≡` only while expanded.
- Register each new floating action with a unique key and add that key to `FLOATING_MENU_ORDER`. A script excluded by Tampermonkey never registers; an action that is unavailable on the current page calls `setFloatingButtonAvailable`. The menu hides when no actions are available.
- Only `≡` is draggable. Its viewport position is saved for the current hostname in site storage and restored on the next visit. Child actions have no independent position. A site with no saved position uses the default.
- `×` saves a disabled flag for the current hostname and reloads the page. Every floating feature checks `floatingMenuDisabled()` before running, including URL-based automatic activation. Inline Archive Today link markers and individual preformatted-block buttons remain separate page features. To undo the disabled flag, remove the `tm-floating-menu-v1:<hostname>` entry from that site's local storage, then reload. Tampermonkey cannot rewrite installed scripts' `@exclude` metadata at runtime, so this setting is enforced by the scripts instead.
- URL-based automatic activation is independent of menu expansion. Enabled actions show their active color when expanded. All five scripts exclude `christorng.idv.tw` and its subdomains in metadata.
- The page-wide translation action stays available while converted blocks exist and reflects whether all blocks are converted. Per-block controls and the inline-code, Mastodon, and Wikipedia translation fixes remain independent of menu expansion.

Site storage is scoped by browser origin. The hostname key makes settings consistent across paths on one origin; HTTP and HTTPS or different subdomains have separate browser storage.

## Maintenance

Keep the four userscript descriptions aligned with their concise README entries. Bump each modified `.user.js` `@version` using the current date. When site-specific URL rules change, update `TestCases.md`. Run `node --test` after synchronizing the shared code.
