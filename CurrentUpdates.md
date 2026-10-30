# Current updates: install and verify

Updated: 2026-10-30

**Experimental Android pilot, Force Mobile View only.** This revision corrects the oversized typography and full-page horizontal overflow reported in the initial `2.1.0` test. Only `src/ForceMobileView.user.js` is changed. The shared `src/FloatingMenu.js` and the other four shared-menu userscripts remain unchanged. Do not merge until Android Edge testing is accepted.

## Updated userscripts (1)

### Force Mobile View — 2026-10-30_2.1.1

**[Install / update ForceMobileView.user.js](src/ForceMobileView.user.js)**

**Important upgrade:** The corrected pilot uses a new per-site preference key (`tm-force-mobile-auto-v2`) so an OFF choice saved while diagnosing broken `2.1.0` does not suppress the new trial. Install the new version, verify its version in Tampermonkey, and fully reload the test page.

### What changed

- **No late viewport injection.** For the verified legacy Data Explorer site, insert the device-width viewport **at document-start**, before the old 980px desktop page renders. Avoid Chromium applying one text-inflation pass before and another after viewport changes.
- **No blanket double font enlargement.** In automatic Data Explorer mode, use a controlled 15px base font and `text-size-adjust: 100%`. Do not subsequently raise every nested font to another minimum.
- **Real page reflow instead of horizontal hiding.** Cover Data Explorer's fixed 980/950/820/735/710/650px areas: the page, floated navigation, SQL editor, query header, subheaders/tabs, results, graph and footer. The SQL editor and data grid may retain their **own** horizontal scrolling; the page itself should not require side-to-side scrolling.
- **Line box and content height fix.** Give paragraphs and titles unitless `line-height: 1.45`, auto height and no restrictive max-height to avoid overlap when translated or enlarged. Also add semantic text-block height correction to the pre-existing manual mode.
- **Early-mode OFF restores original layout with one page reload.** It persists the v2 per-site preference. Tapping ↔ when OFF on Data Explorer resets the preference and reloads to reactivate early reflow. Dynamic removal of viewport metadata cannot reliably restore the old browser viewport, so do not attempt it.
- **Prevent repeated failing changes.** A measured whole-document overflow can trigger a single reload into the unmodified site layout, with a session-scoped failure record. Previously matched URL-based auto-enable and normal manual mode are retained for other sites.
- **Conservative unknown legacy sites.** Browser-shrunk desktop websites other than verified Data Explorer are detected but not modified in this pilot: arbitrary old layouts need separate real-browser verification. Normal mobile pages with sustained very small text retain the guarded font-only auto-fix.

### Android Edge verification

1. [Data Explorer query example](https://data.stackexchange.com/stackoverflow/query/1926661#graph?t=1). Install `2026-10-30_2.1.1` and **reload**. Test with Edge page translation enabled as in the original screenshot, then disabled.
2. Confirm that headings and translated labels have legible, **not giant**, sizes; the query title flows to multiple lines without overlapping the following text.
3. Open ≡, check ×, →, ☽, ↔, and 譯∞ targets do not overlap. Check SQL editor, query results, graph, and footer. Inspect the far-right side of the page. **Only embedded editor/grid scrolling is acceptable; full-page horizontal scrolling is a failure.**
4. Tap ↔ once: the browser reloads to the original layout. Tap ↔ again: it reloads into the corrected mobile mode. Test the behavior after portrait/landscape rotation and pinch zoom.
5. Verify a responsive website with only a small caption remains unchanged; [Hacker News](https://news.ycombinator.com/item?id=46255285) and [Archive Today](https://archive.is/75aY9) preserve their previous URL-based behavior; Windows Edge remains unaffected.

**Other regression references:** [Tiny-font article](https://lcamtuf.coredump.cx/prep/index-old.shtml) · [Fixed line-height article](https://steveblank.com/2026/04/09/nowhere-is-safe/).

### Verification status

The test script now covers 18 runtime cases, including early viewport initialization, legacy dynamic-injection prevention, opt-out/reenable reloads, v1 preference migration, horizontal-overflow fallback, manual block height, and tiny-text false positives. The script and tests passed syntax parsing. All 18 tests passed in an isolated V8 execution of the repository DOM harness with stubbed fixtures and Node APIs; a real `node --test` run remains required before merge. A representative fixed-width HTML/CSS layout was also exercised using headless Chromium with 360px mobile viewport, resulting in 360px document scroll width and auto-height title; this is **not** a capture of the live website or a substitute for Android Edge testing.

**Update scope:** Only this userscript, the matching tests, and documentation. Do not synchronize `src/FloatingMenu.js` or change the other four participating scripts until the standalone pilot is approved.
