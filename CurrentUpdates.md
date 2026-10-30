# Current updates: install and verify

Updated: 2026-10-30

This change updates only Better Discord; previously updated YouTube Tools and other userscripts are unaffected. Install this version from this branch's preview (or main after merge), verify the version in Tampermonkey, and reload your Discord channel.

## Updated userscripts (1)

### Better Discord — 2026-10-30_1.0.10

**[Install / update BetterDiscord.user.js](src/BetterDiscord.user.js)**

**Visible changes:** No extra UI in normal browsing. On Android, append `?bddebug=1` to the current Discord channel URL to open an optional floating diagnostics panel. The panel shows current visual-viewport and window dimensions, composer-to-viewport gap, ancestor element bottom coordinates, and colored outlines. You can capture automatic keyboard events, copy a JSON geometry report, save it as a file, or compare the earlier layout fix ON/OFF. Diagnostics start with the fix OFF so the original problem can be recorded. Windows Edge is unaffected.

**Test links:**
- [Existing Discord channel test](https://discord.com/channels/1475861167476965439/1475861168412164149)
- [Same channel with debug enabled](https://discord.com/channels/1475861167476965439/1475861168412164149?bddebug=1) (requires account access; otherwise append `?bddebug=1` to a channel you can open)

**Verify on Android Edge:**
1. Install/update the script in Tampermonkey, confirm `2026-10-30_1.0.10`, and reload your Discord channel.
2. Open the channel URL with `?bddebug=1`. A small `Discord layout debug` panel appears at the top; the layout fix starts OFF.
3. Screenshot with keyboard closed. Focus the message editor and screenshot again with the keyboard open. Orange = composer, cyan = form, purple = chat wrapper, green = app root; dashed yellow = reported visual viewport bottom. The red tinted area is the geometric gap, if any.
4. While the keyboard is open, read `gap`, `vvH`, `vvBottom`, and ancestor bottoms. Automatic geometry snapshots are retained across focus/resize events. Use `Copy log` or `Save JSON` and provide the report for analysis. The report records only geometry, CSS and browser context, not chat messages, URL, cookies or credentials.
5. Optionally tap `Fix: OFF` to switch ON, and compare with a second screenshot. Close to restore normal operation; remove `?bddebug=1` from the URL for subsequent visits.

**Update scope:** Update only `BetterDiscord.user.js`. The existing input-button suppression remains unchanged. No shared menu scripts need updating.

## Verification notes

`node --test scripts/test-better-discord.js` covers the opt-in diagnostics rendering, captured viewport values, initial fix-off behavior, fix toggle/restore, and Windows exclusion, alongside previous keyboard-layout and button tests. These DOM mocks cannot reproduce Android Edge's keyboard compositor; live screenshots and the JSON report are needed before choosing another CSS correction.
