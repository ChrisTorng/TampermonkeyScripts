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

## Clean-test isolation (2026-11-14)
Before interpreting native Edge translation results, disable **all page-modifying Tampermonkey scripts** on the lab domain, specifically `TranslatePreformattedText.user.js`, `TranslationCrashGuard.user.js`, `MathTranslationGuard.user.js`, and `InlineTranslationOrderGuard.user.js`. Do not assume missing DOM markers prove a globally matched userscript is inactive: TranslatePreformattedText can run without generating an inline-code marker when no `code` element is present. The clean experiment should exclude other page-changing extensions as well when feasible, then re-enable scripts **one at a time** only after the baseline is established.

There is plausible interaction, but **no demonstrated causality from TranslatePreformattedText to MathJax disappearing** in this article. PR #96 documented a clean Android Edge SVG case with `T0 M0 T1 M1 T2` changed to `T0 M0 M1 T1 T2` even with userscripts disabled. Treat the native Edge order issue separately from scripts until comparative evidence says otherwise.


## Android Edge native translation findings — 2026-11-14 05:30 Taipei

**Received and analyzed:** 15 stored DOM reports (five modes, two copies per mode), with a separate server self-test excluded. A native translation control sentence changed from English to Traditional Chinese for all five modes. These are genuine Edge-generated client-side snapshots, not cloud Chromium simulations.

| Mode | Paragraph prose | Formula presence in both copies | Direct child order after translation | Conclusion |
| --- | --- | --- | --- | --- |
| A baseline | Chinese | 5/5 MathJax containers per copy | T0 M0 T1 M1 T2 M2 T3 M3 T4 M4 T5 | Good in this *controlled span-split HTML* |
| B output guard | Chinese | 5/5 MathJax containers per copy | Same, intact | Guard not needed to keep formulas in this fixture |
| C source guard | Chinese | 5/5 MathJax containers per copy | **M0 M1 M2 M3 M4** as remaining direct labeled children; translated prose appears before all formulas | **Reproduces formula displacement** |
| D whole paragraph no-translate | **English, deliberately** | 5/5 MathJax containers per copy | Original order preserved | **Conservative visibility fallback** |
| E atomic SVG images | Chinese | 5/5 loaded images per copy, nonzero image natural widths and geometry | Original labeled direct child order preserved | **Good visibility candidate for this fixture** |

**Key failure evidence for C:** A real post-translation paragraph serializes as `請考慮這個數學問題：「什麼是？」……結論是一樣的。1 +2 +3 +⋯ +10 1 +10 2 +9 3 +8 5 +6`. The original translated text spans still exist but are no longer the paragraph's direct children; Edge has regrouped them and left all independently protected formula spans at the end. This directly contradicts using standalone `translate=no` inline-source wrappers as a universal fix.

**Important boundaries:** The report records DOM, boxes, styles, MathJax nodes, image load and native translation control text. There were no uploaded PNG reports, so actual pixels were **not** independently verified. `mathGuard:false` / `inlineOrder:false` record the absence of *those DOM markers*, **not** proof that every userscript was disabled. The user's earlier message says the scripts including preformatted were disabled for clean testing, but the lab cannot itself audit the full extension state.

**Why original article can still fail when A/B succeed:** The live Alex Wang site has raw prose text nodes and direct `mjx-container` children inside `p` after MathJax 4 renders. This lab deliberately pre-splits all prose into `span[data-part=T]` and all math into `span[data-part=M]`. That structural boundary is a material difference. A/B success therefore supports investigating the *translation-unit/DOM structure* rather than simply adding more `notranslate` attributes; it does not validate that the original article is solved.

**Next lowest-risk validation target:** Compare (a) original bare-text-node paragraph with MathJax-direct-child, (b) only prose split into span siblings with math left untouched, and (c) both prose/math wrapped but **without** formula translate=no flags; do not rewrite TeX source nor reorder DOM after translation. Keep D whole-paragraph `translate=no` as a source-preserving fallback when no native-translation-safe structure is established. Do not promote #148 or ship more math-order mutation patches based on these results.

## D variant update — 2026-11-14: bilingual fallback

Mode D now serves **two complete independent static HTML paragraphs** at each position: a normal, native-translatable first paragraph (may lose/reorder formulae under Edge), immediately followed by a copy of the full original English paragraph with `translate="no"`. Both are shipped before JavaScript runs. This directly tests the user's preferred fallback: read the Chinese version and refer to an intact original math paragraph. Do not conflate this with prior D, which only served the protected original. The experiment uses the **same URL** and the existing opt-in diagnostics receiver; no new website or userscript is required.


## D follow-up reports — 2026-11-14 07:01–07:02 Taipei

The Android Edge session `53231fd4-…` produced two stored reports on the **new two-copy D fixture**, both containing ten recent DOM events each. All events showed ordinary page translation occurred; the near and late translated paragraphs each retained five rendered MathJax formulas in canonical order, and the protected English reference copies also retained all formulas. Client viewport width was 288 CSS pixels. No screenshot report was uploaded.

**Next experiment (this same lab URL, not a new website):**
- D now contains a **third dynamically reconstructed paragraph**. It takes translated text from identified `T0 … Tn` fragments, but takes *only rendered math DOM* from the complete `translate=no` original `M0 … Mn` fragments, ordered by that original reference. No TeX string parsing or re-typesetting in the result. It is a single `translate=no` reconstruction.
- A sentence boundary is detected from punctuation; original and translation sentences are paired **only** when both the sentence count and per-sentence math-ID sequences match. Otherwise it leaves the full original reference available and does not guess sentence alignment.
- A missing translation fragment or missing rendered math means `data-reconstruction=incomplete`; do **not** call the result successful or hide the reference.
- An explicit toggle collapses the two full versions if the third version is complete. Individual sentence originals remain expandable beside the merged Chinese sentence. This is optional to avoid interfering with native translation and diagnostics.
- F uses the conventional text token `⟦MATH_0⟧` as a native-translatable placeholder, then attempts a literal marker lookup and math-DOM reinsertion from a complete protected reference. If Edge changes or drops a marker, it must refuse reconstruction. This is the old placeholder idea tested against **real native Edge**, not the earlier PR #96 mock translation.
- G tests the exact same reconstruction on MathJax 4 CommonHTML, KaTeX HTML/MathML and native MathML. An alternate `?mode=engines&mathjax=3` loads MathJax 3 CommonHTML for comparison. These are renderer-specific smoke tests, not a blanket guarantee for all TeX, extensions, unsupported commands, or custom output libraries.

The third view changes DOM only **outside** the already translated paragraph and protected source paragraph. Do not merge an automatic on-site rewrite based solely on the remote Chromium simulation; the native Edge diagnostics and on-screen readability are the acceptance tests.
