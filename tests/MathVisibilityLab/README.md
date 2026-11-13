# Math Visibility Lab

Public no-install experiment: **https://tm-math-translation-lab.christorng.workers.dev/**

## First principles
1. Keep the original math visible. Favor a readable English paragraph over losing the formula.
2. Check whether each math expression exists after native Edge translation and is actually painted, not just counted as a DOM node.
3. Only after visibility succeeds, investigate sentence position and surrounding translation.
4. Never claim a JavaScript mock or headless Chromium reproduces Edge's native translation engine.

## Current five cases
| Mode | Description | Proposed trade-off |
| --- | --- | --- |
| baseline | MathJax 4, no protection | Reproduction control |
| output | Add translate=no when mjx-container appears | May be too late if Edge translates before MathJax |
| source | Mark each inline TeX source wrapper translate=no in initial HTML | May survive translation while preserving surrounding prose |
| paragraph | Mark the entire English math paragraph translate=no before any scripts run | Conservative: keep math and its English sentence intact |
| image | Static SVG image elements with explicit colors, no MathJax required | Previously shown to preserve formula visibility, but Edge can reorder images |

The page includes a normal English control sentence. It has a near-top sample and a second equivalent sample below 135vh of whitespace to compare translation/scroll timing. The page uses real MathJax 4, as the Alex Wang article currently does. All formula/source snippets are shipped in server HTML, not injected later by JavaScript.

## Historical native Edge findings (not hypotheses)
- PR #85: simple notranslate on MathJax output; not validated as a complete native-translation solution.
- PR #94: Plover custom delimiter conversion could show actual formulas but moved them to paragraph ends on Android Edge.
- PR #96: initial ten-way no-Tampermonkey experiment; static G MathJax 2 case eventually translated, but inline equation cases remained problematic.
- PR #96 later: atomic MathJax SVG-to-img cases survived native Android Edge translation with all three full formulas and adequate contrast. A real clean-device DOM report showed nodes moved from `T0 M0 T1 M1 T2 M2 T3` to `T0 M0 M1 T1 T2 M2 T3`. This reproduces a formula position bug *without* a userscript.
- PR #96: MathJax 4 SVG image export initially clipped formulas because of automatic inline line breaking; fixed experimental export using `output.linebreaks.inline: false`. SVG `currentColor` initially rendered dark/illegible when embedded as img on a dark background; corrected by freezing explicit paint colors.
- PR #97: modes and backups were experimental and not a confirmed universal fix.
- PR #148: splitting math and order scripts passed DOM tests, but user's native Android Edge screenshots on the Alex Wang article show missing formulas / tail reordering. Therefore #148 is **not** an accepted fix.

## How to measure
1. Open the link with no additional userscripts installed. Select paragraph (D) for a conservative baseline, then use Edge's built-in Translate control.
2. Optionally tap **開始自動回報** one time. Only synthetic test DOM, the browser user agent and viewport geometry are uploaded; no cookies, no page outside this lab. Each report expires after 48 hours.
3. Look at the formula and normal English translation control, scroll down, then Show original/Translate again.
4. Compare image (E), source (C), output (B), baseline (A). All are URL query alternatives, without installing/updating userscripts.
5. Download JSON or save the test-region PNG as an alternative. The PNG uses html2canvas, which reproduces DOM painting and *is not* a system screenshot. Android Edge does not expose a general-purpose silent screen-capture API to ordinary pages.

Reports are stored in a dedicated Cloudflare Workers KV namespace, with no IP address recorded by our code and two-day expiration. Worker source: `collector-worker.js`; UI sources: `index.html`, `lab.js`.

## Source evidence
- [Alex Wang article](https://alexwang.ai/posts/reasoning-as-pathfinding/) currently uses original `$...$` TeX, with MathJax 4 `tex-mml-chtml.js` and rendered `mjx-container` nodes; this was confirmed by a real remote Chromium HTML capture, not by the native Edge translator.
- [PR #85](https://github.com/ChrisTorng/TampermonkeyScripts/pull/85)
- [PR #94](https://github.com/ChrisTorng/TampermonkeyScripts/pull/94)
- [PR #96](https://github.com/ChrisTorng/TampermonkeyScripts/pull/96)
- [PR #97](https://github.com/ChrisTorng/TampermonkeyScripts/pull/97)
- [PR #148](https://github.com/ChrisTorng/TampermonkeyScripts/pull/148)

**Unresolved:** whether Android Edge honors the paragraph-level `translate=no` reliably, whether source wrappers preserve inline math, and whether all visible formulas remain in semantic order. Do not merge a production fix until the live evidence resolves visibility first.
