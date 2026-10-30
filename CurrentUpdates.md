# Current updates: install and verify

Updated: 2026-10-30

This change updates only Better Discord. Existing YouTube Tools and all other userscripts are unaffected. Install the new version from this branch preview (or main after merge), confirm the metadata version, and reload the Discord channel.

## Updated userscripts (1)

### Better Discord — 2026-10-30_1.0.11

**[Install / update BetterDiscord.user.js](src/BetterDiscord.user.js)**

**Visible changes:** Android Edge no longer enables the experimental height and translate keyboard repair automatically; screenshots revealed that the repair could introduce a large gap. Input-button simplification is unchanged. Optional `?bddebug=1` diagnostics remain available with **Fix: OFF** initially. The explicit Fix toggle is experimental. Closing the panel always removes its correction instead of silently turning the repair ON again. JSON records the applied shift and adjusted container, and now retains up to 64 snapshots including delayed 1.5-second and 2.5-second keyboard-settled captures. Windows Edge remains unaffected.

**Test links:**
- [Existing Discord channel](https://discord.com/channels/1475861167476965439/1475861168412164149) (account required)
- [Discord channel with layout diagnostics](https://discord.com/channels/1475861167476965439/1475861168412164149?bddebug=1) (account required; substitute an accessible channel if necessary)

**Verify on Android Edge:**
1. Update the script and confirm `2026-10-30_1.0.11`. Reload Discord **without** `bddebug=1` and focus the editor. The composer should remain in Discord's native location just above the keyboard; the script must not apply height or translate corrections.
2. Open `?bddebug=1`; with **Fix: OFF**, capture keyboard-closed and keyboard-open screenshots. Keep the keyboard open for at least 2.5 seconds to collect settled samples, then use **Copy log** or **Save JSON**. Compare the `focus+1500ms` and `focus+2500ms` events with earlier snapshots; ignore early focus-only dimensions if the keyboard was still animating.
3. If needed for diagnosis, select **Fix: ON**, capture a comparison, then press **Close**. Closing must leave the native layout restored, not reactivate the old repair.
4. Confirm input buttons are simplified as before, and verify that Windows Edge is unchanged.

**Update scope:** Only `BetterDiscord.user.js`. No shared floating controls require reinstallation.

## Verification notes

`node --test scripts/test-better-discord.js` covers the native default-off behavior, explicitly opted-in experimental repair, diagnostic cleanup, and previous input-button handling. Local DOM mocks cannot reproduce Android Edge's IME compositor. Real-device verification is required before claiming the original keyboard gap is fully solved.
