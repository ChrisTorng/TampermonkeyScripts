# Shared floating menu

`AllGoInternetArchive.user.js`, `InternetArchive.user.js`, `ForceMobileView.user.js`, `ForceDarkMode.user.js`, and `TranslatePreformattedText.user.js` share the floating menu implementation in `src/FloatingMenu.js`. The source is copied into each userscript between the `BEGIN SHARED FLOATING MENU` and `END SHARED FLOATING MENU` markers. After changing the shared source, run `node scripts/sync-floating-menu.js` and review all five userscripts and their tests. A change must satisfy every consumer; never edit just one generated copy.

Tampermonkey supports `@require`, but embedding the shared code keeps each installed userscript self-contained and avoids remote dependency timing and update issues. The copies coordinate through one DOM menu element rather than relying on a shared userscript JavaScript realm. The sync script is idempotent.

## Behavior

- The collapsed `≡` control starts at the previous archive arrow position, 70 px below the top and flush with the right edge. Its menu opens downward with `→`, `↔`, `☽`, and `譯∞` in that fixed order, regardless of script startup order. `InternetArchive.user.js` supplies the `→` action on Wayback pages. The `×` control appears above `≡` only while expanded.
- Register each new floating action with a unique key and add that key to `FLOATING_MENU_ORDER`. A script excluded by Tampermonkey never registers; an action that is unavailable on the current page calls `setFloatingButtonAvailable`. The menu hides when no actions are available.
- Only `≡` is draggable. Its horizontal position and clearance from the page top are saved for the current hostname in site storage and restored on the next visit. Child actions have no independent position. A site with no saved position uses the default.
- Normal scrolling reduces the handle's viewport top offset from its page-top clearance to zero; scrolling back restores that clearance. Dragging can reach zero at the viewport top. Only a drag at page top changes the saved top clearance. A drag farther down the page stays exactly where released, then moves upward gradually with further downward scrolling until it docks at zero. Upward scrolling returns a temporary placement smoothly to the saved clearance at page top. The expanded `×` may be offscreen while the handle touches the viewport top.
- The menu uses absolute document coordinates. While the visual viewport is pinch-zoomed, scrolling, panning, and resizing must not pull the menu into the visible area or change its saved position. At normal scale, normal scroll positioning resumes. Never clamp against visual viewport dimensions or offsets.
- Every menu action uses the shared inactive and active colors through `aria-pressed`. Individual block controls may retain their own styling; menu actions must not override the shared background or text colors with inline styles.
- Menu buttons darken on hover and return to their normal inactive or active color on pointer exit. Explicitly suppress page-provided text decoration, including hover, focus, and active states. Clicking outside the menu or choosing an action collapses it; clicks on its handle stay inside the menu.
- `×` opens a confirmation panel with page, folder-path, whole-domain, and cancel choices. A confirmed scope is saved under `tm-floating-menu-v1:<hostname>` and the page reloads. Every floating feature checks the selected scope before running, including URL-based automatic activation. Legacy whole-site disabled settings remain supported. Inline Archive Today link markers and individual preformatted-block buttons remain separate page features.
- URL-based automatic activation is independent of menu expansion. Enabled actions show their active color when expanded. All five scripts exclude `christorng.idv.tw` and its subdomains in metadata.
- The page-wide translation action stays available while converted blocks exist and reflects whether all blocks are converted. Per-block controls and the inline-code, Mastodon, and Wikipedia translation fixes remain independent of menu expansion.

Site storage is scoped by browser origin. Page and folder exclusions apply within that origin; HTTP and HTTPS or different subdomains have separate browser storage.

## Maintenance

Keep the five userscript descriptions aligned with their concise README entries, grouped first in both the descriptions and installation links. Bump each modified `.user.js` `@version` using the current date. When site-specific URL rules change, update `TestCases.md`. Run `node --test` after synchronizing the shared code.
